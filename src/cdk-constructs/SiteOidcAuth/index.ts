import { Construct } from "constructs";
import SecretsManager from "aws-cdk-lib/aws-secretsmanager";
import CloudFront from "aws-cdk-lib/aws-cloudfront";
import CDK from "aws-cdk-lib";
import Lambda from "aws-cdk-lib/aws-lambda";
import * as SST from "sst/constructs";
import { isCDKConstruct } from "sst/constructs/Construct.js";
import { Config as SSTInternalConfig } from "sst/config.js";
import CloudFrontOrigins from "aws-cdk-lib/aws-cloudfront-origins";
import path from "node:path";
import fs from "node:fs";
import { transformSync } from "esbuild";
import type {
  ExtendedNextjsSiteProps,
  ExtendedStaticSiteProps,
} from "../../lib/site/support.js";

type ConstructScope = ConstructorParameters<typeof Construct>[0];
type ConstructId = ConstructorParameters<typeof Construct>[1];

export type Props = {
  oidcIssuerUrl: string;
  oidcClientId: string;
  oidcScope: string;
};
export type AddToSiteProps = { prefix?: string };

const defaultAuthRoutePrefix = "/auth";

export class SiteOidcAuth extends Construct {
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

  addToStaticSiteProps<SiteProps extends ExtendedStaticSiteProps>(
    scope: ConstructScope,
    siteProps: SiteProps,
    { prefix = defaultAuthRoutePrefix }: AddToSiteProps = {},
  ) {
    prefix = prefix.replace(/\/$/, ""); // Remove trailing slash from prefix if it has one
    const behaviourName = `${prefix.replace(/^\//g, "")}/*`;
    const distribution = siteProps.cdk?.distribution;
    if (isCDKConstruct(distribution)) {
      throw new Error(
        `CDK Construct for distribution is not supported when adding CloudFront OIDC Auth behavior for prefix ${prefix}`,
      );
    }

    const updatedSiteProps = {
      ...siteProps,
      cdk: {
        ...siteProps.cdk,
        distribution: {
          ...siteProps.cdk?.distribution,
          additionalBehaviors: distribution?.additionalBehaviors ?? {},
          defaultBehavior: {
            ...distribution?.defaultBehavior,
            functionAssociations:
              distribution?.defaultBehavior?.functionAssociations ?? [],
          },
        },
      },
    };

    if (updatedSiteProps.cdk.distribution.additionalBehaviors[behaviourName]) {
      throw new Error(
        `Behavior for prefix ${prefix} already exists in distribution definition`,
      );
    }

    const jwtSecret = this.createJwtSecret();

    updatedSiteProps.cdk.distribution.defaultBehavior.functionAssociations.push(
      this.getFunctionAssociation(scope, jwtSecret, prefix),
    );
    updatedSiteProps.cdk.distribution.additionalBehaviors[behaviourName] =
      this.getAuthBehaviorOptions(scope, jwtSecret, prefix);

    return updatedSiteProps;
  }

  addToSsrSiteProps<SiteProps extends ExtendedNextjsSiteProps>(
    scope: ConstructScope,
    siteProps: SiteProps,
    { prefix = defaultAuthRoutePrefix }: AddToSiteProps = {},
  ) {
    prefix = prefix.replace(/\/$/, ""); // Remove trailing slash from prefix if it has one
    const behaviourName = `${prefix.replace(/^\//g, "")}/*`;
    const updatedSiteProps = {
      ...siteProps,
      cdk: {
        ...siteProps.cdk,
        distribution: {
          ...siteProps.cdk?.distribution,
          additionalBehaviors:
            siteProps.cdk?.distribution?.additionalBehaviors ?? {},
        },
      },
    };
    if (updatedSiteProps.cdk.distribution.additionalBehaviors[behaviourName]) {
      throw new Error(
        `Behavior for prefix ${prefix} already exists in distribution definition`,
      );
    }

    const jwtSecret = this.createJwtSecret();

    updatedSiteProps.cdk.transform = (plan) => {
      siteProps?.cdk?.transform?.(plan);

      plan.cloudFrontFunctions?.serverCfFunction.injections.push(
        this.getAuthCheckHandlerBodyCode(jwtSecret, prefix),
      );
    };

    updatedSiteProps.cdk.distribution.additionalBehaviors[behaviourName] =
      this.getAuthBehaviorOptions(scope, jwtSecret, prefix);

    return updatedSiteProps;
  }

  private createJwtSecret() {
    return new SecretsManager.Secret(this, `${this.id}JwtSecret`, {
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
  }

  // Get the CloudFront Function Association for auth checking
  // Roughly based off https://github.com/sst/v2/blob/4283d706f251724308b397996ff307929bf3a976/packages/sst/src/constructs/SsrSite.ts#L941
  private getFunctionAssociation(
    scope: ConstructScope,
    jwtSecret: SecretsManager.Secret,
    authRoutePrefix: string,
  ): CloudFront.FunctionAssociation {
    const authCheckFunction = new CloudFront.Function(
      scope,
      `${this.id}AuthCheckFunction`,
      {
        code: CloudFront.FunctionCode.fromInline(
          this.convertToCloudFrontFunctionCompatibleCode(
            `function handler(event) {
              var request = event.request;
              ${this.getAuthCheckHandlerBodyCode(jwtSecret, authRoutePrefix)}
              return request;
            }`,
          ),
        ),
        // We could specify the JS v2.0 runtime here but for SSR sites SST does the function creation and that currently
        // uses JS v1.0 so no point using v2.0 here as the code has to be compatible with v1.0 anyway.
      },
    );

    return {
      function: authCheckFunction,
      eventType: CloudFront.FunctionEventType.VIEWER_REQUEST,
    };
  }

  private getAuthCheckHandlerBodyCode(
    jwtSecret: SecretsManager.Secret,
    authRoutePrefix: string,
  ): string {
    const sourceCode = fs
      .readFileSync(
        path.join(import.meta.dirname, "auth-check-handler-body.ts"),
        "utf8",
      )
      .replace(
        "__placeholder-for-jwt-secret__",
        jwtSecret.secretValue.toString(),
      )
      .replace("__placeholder-for-auth-route-prefix__", authRoutePrefix);

    // Strip typescript types
    return transformSync(sourceCode, {
      loader: "ts",
    }).code;
  }

  private convertToCloudFrontFunctionCompatibleCode(
    sourceCode: string,
  ): string {
    // ESBuild doesn't currently support transforming const/let to var, which is required for CloudFront Functions
    // JS runtime 1.0.
    sourceCode = sourceCode
      .replaceAll(/const /g, "var ")
      .replaceAll(/let /g, "var ");
    return transformSync(sourceCode, {
      minify: true,
      target: "es5",
    }).code;
  }

  // Get the behavior options for the auth route
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
        code: CloudFront.FunctionCode.fromInline(
          this.convertToCloudFrontFunctionCompatibleCode(
            `function handler(event) {
              const request = event.request;
              request.headers["x-forwarded-host"] = { value: request.headers.host.value };
              return request;
            }`,
          ),
        ),
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
          cachePolicyName: `${this.id}-AllowAllCookiesPolicy`,
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
      viewerProtocolPolicy: CloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      functionAssociations: [
        {
          function: forwardHostHeaderCfFunction,
          eventType: CloudFront.FunctionEventType.VIEWER_REQUEST,
        },
      ],
    };
  }
}
