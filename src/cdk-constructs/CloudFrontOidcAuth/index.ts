import { Construct } from "constructs";
import SecretsManager from "aws-cdk-lib/aws-secretsmanager";
import CloudFront from "aws-cdk-lib/aws-cloudfront";
import CDK from "aws-cdk-lib";
import CdkCustomResources from "aws-cdk-lib/custom-resources";
import Lambda from "aws-cdk-lib/aws-lambda";
import * as SST from "sst/constructs";
import { Config as SSTInternalConfig } from "sst/config.js";
import CloudFrontOrigins from "aws-cdk-lib/aws-cloudfront-origins";
import { BaseSiteCdkDistributionProps } from "sst/constructs/BaseSite.js";
import path from "node:path";
import fs from "node:fs";

type ConstructScope = ConstructorParameters<typeof Construct>[0];
type ConstructId = ConstructorParameters<typeof Construct>[1];

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

type Props = {
  oidcIssuerUrl: string;
  oidcClientId: string;
  oidcScope: string;
};

export class CloudFrontOidcAuth extends Construct {
  readonly oidcIssuerUrl: string;
  readonly oidcClientId: string;
  readonly oidcScope: string;
  readonly id: string;

  constructor(scope: ConstructScope, id: ConstructId, props: Props) {
    super(scope, id);
    this.oidcIssuerUrl = props.oidcIssuerUrl;
    this.oidcClientId = props.oidcClientId;
    this.oidcScope = props.oidcScope;
    this.id = id;
  }

  addToDistributionDefinition<
    DistributionProps extends BaseSiteCdkDistributionProps,
  >(
    scope: ConstructScope,
    {
      distributionDefinition,
      prefix = "/auth",
    }: { distributionDefinition: Mutable<DistributionProps>; prefix?: string },
  ) {
    const updatedDistributionDefinition = { ...distributionDefinition };
    const behaviourName = `${prefix.replace(/^\//g, "")}/*`;
    updatedDistributionDefinition.additionalBehaviors =
      updatedDistributionDefinition.additionalBehaviors
        ? { ...updatedDistributionDefinition.additionalBehaviors }
        : {};
    if (updatedDistributionDefinition.additionalBehaviors[behaviourName]) {
      throw new Error(
        `Behavior for prefix ${prefix} already exists in distribution definition`,
      );
    }

    const jwtSecret = new SecretsManager.Secret(this, `${this.id}JwtSecret`, {
      description: "JWT Signing Secret",
      generateSecretString: {
        passwordLength: 32,
        excludePunctuation: true,
        includeSpace: false,
        requireEachIncludedType: true,
      },
      // Secret is only used for sessions so it's safe to delete on stack removal
      removalPolicy: CDK.RemovalPolicy.DESTROY,
    });

    updatedDistributionDefinition.defaultBehavior = {
      ...updatedDistributionDefinition.defaultBehavior,
      functionAssociations: [
        ...(updatedDistributionDefinition.defaultBehavior
          ?.functionAssociations || []),
        this.getFunctionAssociation(scope, jwtSecret),
      ],
    };
    updatedDistributionDefinition.additionalBehaviors[behaviourName] =
      this.getAuthBehaviorOptions(scope, jwtSecret, prefix);
    return updatedDistributionDefinition;
  }

  private getFunctionAssociation(
    scope: ConstructScope,
    jwtSecret: SecretsManager.Secret,
  ): CloudFront.FunctionAssociation {
    const cfKeyValueStore = new CloudFront.KeyValueStore(
      scope,
      `${this.id}CFKeyValueStore`,
    );

    const kvStoreId = cfKeyValueStore.keyValueStoreId; // Your KV store ID
    const key = "jwt-secret";
    const kvsArn = `arn:aws:cloudfront::${CDK.Stack.of(this).account}:key-value-store/${kvStoreId}`;

    // Updating the KVM requires a valid ETag to be provided in the IfMatch parameter so we first must fetch the ETag
    const getEtag = new CdkCustomResources.AwsCustomResource(
      this,
      `${this.id}GetKVStoreEtag`,
      {
        installLatestAwsSdk: false, // No real benefit in our case for the cost of a longer execution time
        onUpdate: {
          // Since there's no onCreate, onUpdate will be called for CREATE events
          service: "@aws-sdk/client-cloudfront-keyvaluestore",
          action: "describeKeyValueStore",
          parameters: { KvsARN: kvsArn },
          // We include a timestamp in the physicalResourceId to ensure we fetch the latest etag on every update
          physicalResourceId: CdkCustomResources.PhysicalResourceId.of(
            `${kvStoreId}-etag-${Date.now()}`,
          ),
        },
        policy: CdkCustomResources.AwsCustomResourcePolicy.fromSdkCalls({
          resources: [kvsArn],
        }),
      },
    );
    const etag = getEtag.getResponseField("ETag");

    // An annoying limitation of CloudFormation is that it won't resolve dynamic references for secrets when
    // used as a parameter to a custom resource. To get around this we manually resolve it with another custom
    // resource. Note this won't result in the secret being exposed in CloudFormation templates but it will
    // be visible in the CloudWatch logs of the custom resource lambda. In our case that is acceptable.
    // https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/341
    const secretValue = new CdkCustomResources.AwsCustomResource(
      this,
      `${this.id}GetSecret`,
      {
        // There's no real benefit of fetching the latest sdk our case for the cost of a longer execution time
        installLatestAwsSdk: false,
        // Since there's no onCreate, onUpdate will be called for CREATE events
        onUpdate: {
          service: "@aws-sdk/client-secrets-manager",
          action: "getSecretValue",
          parameters: {
            SecretId: jwtSecret.secretArn,
          },
          // We include a timestamp in the physicalResourceId to ensure we fetch the latest secret value on every update
          physicalResourceId: CdkCustomResources.PhysicalResourceId.of(
            `${this.id}GetSecret-${Date.now()}`,
          ),
        },
        policy: CdkCustomResources.AwsCustomResourcePolicy.fromSdkCalls({
          resources: [jwtSecret.secretArn],
        }),
      },
    );

    // Now we can actually update the KVS with the secret value
    const putKeyValue = new CdkCustomResources.AwsCustomResource(
      this,
      `${this.id}PutKeyValue`,
      {
        installLatestAwsSdk: false, // No real benefit in our case for the cost of a longer execution time
        onUpdate: {
          // Since there's no onCreate, onUpdate will be called for CREATE events
          service: "@aws-sdk/client-cloudfront-keyvaluestore",
          action: "putKey",
          parameters: {
            KvsARN: kvsArn,
            Key: key,
            Value: secretValue.getResponseField("SecretString"),
            IfMatch: etag,
          },
          physicalResourceId: CdkCustomResources.PhysicalResourceId.of(
            `${kvStoreId}-${key}`,
          ),
        },
        policy: CdkCustomResources.AwsCustomResourcePolicy.fromSdkCalls({
          resources: [kvsArn],
        }),
      },
    );

    // putKey in the @aws-sdk/client-cloudfront-keyvaluestore package requires @aws-sdk/signature-v4-crt to be imported
    // as well. But AwsCustomResource doesn't give us direct access to the underlying Lambda function so we inject a
    // NODE_OPTIONS env var to import on start. At some point AwsCustomResource will presumably switch to a later node
    // version and we might need to update this to '--import=' instead of '--require='.
    const fn = putKeyValue.node.findChild("Provider");
    if (!(fn instanceof Lambda.SingletonFunction)) {
      throw new Error(
        "Could not find the underlying Lambda function of the AwsCustomResource",
      );
    }
    fn.addEnvironment("NODE_OPTIONS", "--require=@aws-sdk/signature-v4-crt");

    const authCheckFunction = new CloudFront.Function(
      scope,
      `${this.id}AuthCheckFunction`,
      {
        code: CloudFront.FunctionCode.fromInline(
          fs
            .readFileSync(
              path.join(import.meta.dirname, "auth-check.js"),
              "utf8",
            )
            .replace("__placeholder-for-jwt-secret-key__", key),
        ),
        runtime: CloudFront.FunctionRuntime.JS_2_0,
        keyValueStore: cfKeyValueStore,
      },
    );

    return {
      function: authCheckFunction,
      eventType: CloudFront.FunctionEventType.VIEWER_REQUEST,
    };
  }

  private getAuthBehaviorOptions(
    scope: ConstructScope,
    jwtSecret: SecretsManager.Secret,
    prefix: string,
  ): CloudFront.BehaviorOptions {
    const authRouteFunction = new SST.Function(
      scope,
      `${this.id}AuthRouteFunction`,
      {
        runtime: "nodejs20.x",
        handler: path.join(import.meta.dirname, "auth-route.handler"),
        environment: {
          OIDC_ISSUER_URL: this.oidcIssuerUrl,
          OIDC_CLIENT_ID: this.oidcClientId,
          OIDC_SCOPE: this.oidcScope,
          JWT_SECRET: jwtSecret.secretValue.toString(),
        },
      },
    );

    // authRouteFunction uses SST's AuthHandler construct which is normally run inside a lambda that's
    // created by SST's Auth construct. AuthHandler expects certain environment variables to be set
    // by the Auth construct so we have to set them ourselves here to keep it happy.
    const envVarName = SSTInternalConfig.envFor({
      type: "Auth",
      id: "id", // It seems like the env var will still be found no matter what this value is
      prop: "prefix",
    });
    authRouteFunction.addEnvironment(envVarName, prefix);

    const authRouteFunctionUrl = authRouteFunction.addFunctionUrl({
      authType: Lambda.FunctionUrlAuthType.NONE,
    });
    const forwardHostHeaderCfFunction = new CloudFront.Function(
      scope,
      `${this.id}ForwardHostHeaderFunction`,
      {
        code: CloudFront.FunctionCode.fromInline(`
        function handler(event) {
          const request = event.request;
          request.headers["x-forwarded-host"] = { value: request.headers.host.value };
          return request;
        }
      `),
        runtime: CloudFront.FunctionRuntime.JS_2_0,
      },
    );

    return {
      origin: new CloudFrontOrigins.HttpOrigin(
        CDK.Fn.parseDomainName(authRouteFunctionUrl.url),
      ),
      allowedMethods: CloudFront.AllowedMethods.ALLOW_ALL,
      cachePolicy: new CloudFront.CachePolicy(
        scope,
        `${this.id}AllowAllCookiesPolicy`,
        {
          cachePolicyName: "AllowAllCookiesPolicy",
          comment: "Cache policy that forwards all cookies",
          defaultTtl: CDK.Duration.seconds(1),
          minTtl: CDK.Duration.seconds(1),
          maxTtl: CDK.Duration.seconds(1),
          cookieBehavior: CloudFront.CacheCookieBehavior.all(),
          headerBehavior:
            CloudFront.CacheHeaderBehavior.allowList("X-Forwarded-Host"),
          queryStringBehavior: CloudFront.CacheQueryStringBehavior.all(),
          enableAcceptEncodingGzip: true,
          enableAcceptEncodingBrotli: true,
        },
      ),
      functionAssociations: [
        {
          function: forwardHostHeaderCfFunction,
          eventType: CloudFront.FunctionEventType.VIEWER_REQUEST,
        },
      ],
    };
  }
}
