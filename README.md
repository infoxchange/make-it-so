# Make It So

[![NPM Version](https://img.shields.io/npm/v/%40infoxchange%2Fmake-it-so)](https://www.npmjs.com/package/@infoxchange/make-it-so)

A helpful little library that allows you to deploy apps on Infoxchange's (IX) infrastructure without having to specify all the implementation details that are specific to IX's deployment environment. You tell it what you want and it will worry about making it happen. Most of the heavily lifting is done by [SST (version 2)](https://v2.sst.dev/what-is-sst) which is extending to take care the IX related specifics.

## Installation

```shell
# NPM
npm --save-dev @infoxchange/make-it-so
# Yarn
yarn add --dev @infoxchange/make-it-so
```

## Features

### deployConfig

The IX pipeline provides certain information about the deployment currently in progress via environment variables. deployConfig gives you a friendly (and typed) way to access these details.

```typescript
import deployConfig from "@infoxchange/make-it-so/deployConfig";

if (deployConfig.isIxDeploy) {
  console.log(
    `Deploying ${deployConfig.appName} into ${deployConfig.environment}`,
  );
} else {
  console.log(`Not deploying via the IX deploy pipeline`);
}
```

<details>
<summary><strong>Full list of available deployment properties</strong></summary>

| Name              | Description                            | Type for IX Deploy                 | Type for non-IX Deploy |
| ----------------- | -------------------------------------- | ---------------------------------- | ---------------------- |
| isIxDeploy        | Is deploying via IX pipeline or not    | true                               | false                  |
| appName           | Name of app being deployed             | string                             | string                 |
| environment       | Name of env app is being deployed to   | "dev" \| "test" \| "uat" \| "prod" | string                 |
| workloadGroup     | The workload group of the app          | "ds" \| "srs"                      | string                 |
| primaryAwsRegion  | AWS Region used by IX                  | "ap-southeast-2"                   | string                 |
| siteDomains       | Domains for the app to use             | string[]                           | string[]               |
| siteDomainAliases | Domains to be redirected to primary    | string[]                           | string[]               |
| isInternalApp     | If app is for internal usage           | boolean                            | boolean \| undefined   |
| deploymentType    | What pipeline type is being used       | "docker" \| "serverless"           | string                 |
| sourceCommitRef   | The git commit ref of deployed code    | string                             | string                 |
| sourceCommitHash  | The git commit hash of deployed code   | string                             | string                 |
| deployTriggeredBy | Config commit id that triggered deploy | string                             | string                 |
| smtpHost          | SMTP host for the app to use           | string                             | string                 |
| smtpPort          | SMTP port for the app to use           | number                             | number \| undefined    |
| clamAVUrl         | ClamAV instance url for the app to use | string                             | string                 |

</details>

### CDK Constructs blar

<details>
<summary><strong>IxNextjsSite</strong> - Deploys a serverless instance of a Next.js.</summary>

IxNextjsSite extends [SST's NextjsSite](https://v2.sst.dev/constructs/NextjsSite) with a few minor changes to the props
and behaviour.

If the `customDomain` prop is not set then the first site domain provided by the IX deployment pipeline will be used as the primary custom domain, any additional domains (if there are any) will be used as alternative domain names and the first pipeline provided domain alias domain will be used will be used as a domain alias. This behaviour of setting pipeline configuring custom domains can be avoided by providing a value for `customDomain` (including explicitly setting it to `undefined` which will ensure no customDomain is used).

If `isIxManagedDomain` is true (which is the case if `customDomain` is set automatically using pipeline provided values) and no custom certificate is given then one will be created for any custom domains given (including alternative domain names which the base SST construct doesn't currently do).

Also if `isIxManagedDomain` is true DNS records will be automatically created for them.

It will also automatically attach the site to the standard IX VPC created in each workload account (unless you
explicitly pass other VPC details or set the VPC-related props (see the SST doco) to `undefined`) and set the env vars
`HTTP_PROXY`, `http_proxy`, `HTTPS_PROXY` and `https_proxy` to the HTTP Proxy for the VPC.

Unlike [NextjsSite](https://v2.sst.dev/constructs/NextjsSite), any environment variables set with `stackOrApp.setDefaultFunctionProps()` or
`stackOrApp.addDefaultFunctionEnv()` will be inherited by the IxNextjsSite lambda functions.

#### Options:

| Prop                                 | Type                                                             | Description                                                                                                                                                                                                                                                                                                                |
| ------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [...NextjsSiteProps]                 |                                                                  | Any props accepted by [SST's NextjsSite](https://v2.sst.dev/constructs/NextjsSite)                                                                                                                                                                                                                                         |
| customDomain.isIxManagedDomain       | boolean                                                          | (optional) If true will attempt to create DNS records and certs for it using the IX shared infra. Only required if explicitly setting customDomains and you want DNS records + certs setup for them                                                                                                                        |
| customDomain.additionalDomainAliases | string[]                                                         | (optional) Works like `customDomain.domainAlias` but `domainAlias` only allows one domain, additionalDomainAliases allows setting additional domains                                                                                                                                                                       |
| environment                          | Record<string, string \| {buildtime?: string, runtime?: string}> | (optional) As well as accepting strings for environment variable values as is already done by [NextjsSite](https://v2.sst.dev/constructs/NextjsSite) it also accepts an object with the properties `buildtime` and/or `runtime` which allows you to customise the environment variable value during those different steps. |

```typescript
import { IxNextjsSite } from "@infoxchange/make-it-so/cdk-constructs";

const site = new IxNextjsSite(stack, "Site", {
  environment: {
    DATABASE_URL: process.env.DATABASE_URL || "",
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  },
  // The default behaviour is the same as if you included:
  // customDomain: {
  //   domainName: ixDeployConfig.siteDomains[0],
  //   alternateNames: ixDeployConfig.siteDomains.slice(1)
  // },
});
```

</details>

<details>
<summary><strong>IxStaticSite</strong> - Deploys a static site.</summary>

IxNextjsSite extends [SST's StaticSite](https://v2.sst.dev/constructs/StaticSite) and takes the same props with the addition of `isIxManagedDomain` in the `customDomain` property.

If the props `customDomain` is not set then the first site domain provided by the IX deployment pipeline will be used as the primary custom domain, any additional domains (if there are any) will be used as alternative domain names and the first pipeline provided domain alias domain will be used will be used as a domain alias. This behaviour of setting pipeline configuring custom domains can be avoided by providing a value for `customDomain` (including explicitly setting it to `undefined` which will ensure no customDomain is used).

If `isIxManagedDomain` is true (which is the case if `customDomain` is set automatically using pipeline provided values) and no custom certificate is given then one will be created for any custom domains given (including alternative domain names which the base SST construct doesn't currently do).

Also if `isIxManagedDomain` is true DNS records will be automatically created for them.

#### Options:

| Prop                                 | Type     | Description                                                                                                                                                                                         |
| ------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [...NextjsSiteProps]                 |          | Any props accepted by [SST's StaticSite](https://v2.sst.dev/constructs/StaticSite)                                                                                                                  |
| customDomain.isIxManagedDomain       | boolean  | (optional) If true will attempt to create DNS records and certs for it using the IX shared infra. Only required if explicitly setting customDomains and you want DNS records + certs setup for them |
| customDomain.additionalDomainAliases | string[] | (optional) Works like `customDomain.domainAlias` but `domainAlias` only allows one domain, additionalDomainAliases allows setting additional domains                                                |

```typescript
import { IxStaticSite } from "@infoxchange/make-it-so/cdk-constructs";

const site = new IxStaticSite(stack, "Site", {
  environment: {
    DOOHICKEY_NAME: process.env.DOOHICKEY_NAME || "",
  },
  // The default behaviour is the same as if you included:
  // customDomain: {
  //   domainName: ixDeployConfig.siteDomains[0],
  //   alternateNames: ixDeployConfig.siteDomains.slice(1)
  // },
});
```

</details>

<details>
<summary><strong>IxApi</strong> - Deploys an instance of API Gateway.</summary>

IxApi extends [SST's Api](https://v2.sst.dev/constructs/Api) and takes the exact same props.

It will automatically create certificates and DNS records for a single domain that the API should deploy to. If the props `customDomain` is not set the first site domain provided by the IX deployment pipeline will be used as the domain. Explicitly setting `customDomain` to `undefined` will ensure no customDomain is used. Regardless of if a custom domain is set, the API Gateway will still be accessible via the 'api-id.execute-api.region.amazonaws.com' url.

```typescript
import { IxApi } from "@infoxchange/make-it-so/cdk-constructs";

const site = new IxApi(stack, "api", {
  // The default behaviour is the same as if you included:
  // customDomain: {
  //   domainName: ixDeployConfig.siteDomains[0],
  // },
});
```

</details>

<details>
<summary><strong>IxElasticache</strong> - Deploys an AWS Elasticache cluster, either the redis or the memcached flavour.</summary>

It will also automatically attach the cluster to the standard IX VPC created in each workload account (unless you explicitly pass a different VPC to be attached with the vpc prop or set the vpc prop to `undefined` which will stop any VPC being attached).

```typescript
import { IxElasticache } from "@infoxchange/make-it-so/cdk-constructs";

const redisCluster = new IxElasticache(stack, "elasticache", {
  autoMinorVersionUpgrade: true,
  cacheNodeType: "cache.t2.small",
  engine: "redis",
  numCacheNodes: 1,
});
```

#### Options:

| Prop                      | Type     | Description                                                                                                                                           |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| vpc                       | IVpc     | (optional) A VPC to attach if not using default IX VPC                                                                                                |
| vpcSubnetIds              | string[] | (optional) List of IDs of subnets to be used if not using default IX VPC subnets                                                                      |
| [...CfnCacheClusterProps] |          | Any props accepted by [CfnCacheCluster](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_elasticache.CfnCacheCluster.html#construct-props) |

#### Properties:

| Properties       | Type            | Description                                                      |
| ---------------- | --------------- | ---------------------------------------------------------------- |
| connectionString | string          | A string with all the details required to connect to the cluster |
| cluster          | CfnCacheCluster | An AWS CDK CfnCacheCluster instance                              |

</details>

<details>
<summary><strong>IxCertificate</strong> - Creates a new DNS validated ACM certificate for a domain managed by IX.</summary>

```typescript
import { IxCertificate } from "@infoxchange/make-it-so/cdk-constructs";

const domainCert = new IxCertificate(scope, "ExampleDotComCertificate", {
  domainName: "example.com",
  subjectAlternativeNames: ["other-domain.com"],
  region: "us-east-1",
});
```

#### Options:

| Prop                    | Type     | Description                                                     |
| ----------------------- | -------- | --------------------------------------------------------------- |
| domainName              | string   | Domain name for cert                                            |
| subjectAlternativeNames | string[] | (optional) Any domains for the certs "Subject Alternative Name" |
| region                  | string   | (optional) The AWS region to create the cert in                 |

</details>

<details>
<summary><strong>IxDnsRecord</strong> - Creates a DNS record for a domain managed by IX.</summary>

Route53 HostedZones for IX managed domains live in the dns-hosting AWS account so if a workload AWS account requires a DNS record to be created this must be done "cross-account". IxDnsRecord handles that part for you. Just give it the details for the DNS record itself and IxDnsRecord will worry about creating it.

```typescript
import { IxDnsRecord } from "@infoxchange/make-it-so/cdk-constructs";

new IxDnsRecord(scope, "IxDnsRecord", {
  type: "A",
  name: "example.com",
  value: "1.1.1.1",
  ttl: 900,
});
```

#### Options:

| Prop         | Type                                       | Description                                                                                                                                                                                                                     |
| ------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| type         | "A" \| "CNAME" \| "NS" \| "SOA" \| "ALIAS" | DNS record type                                                                                                                                                                                                                 |
| name         | string                                     | DNS record FQDN                                                                                                                                                                                                                 |
| value        | string                                     | DNS record value                                                                                                                                                                                                                |
| ttl          | number                                     | (optional) TTL value for DNS record                                                                                                                                                                                             |
| hostedZoneId | string                                     | (optional) The ID of the Route53 HostedZone belonging to the dns-hosting account in which to create the DNS record. If not given the correct HostedZone will be inferred from the domain in the "value" prop.                   |
| aliasZoneId  | string                                     | (only needed if type = "Alias") the Route53 HostedZone that the target of the alias record lives in. Generally this will be the well known ID of a HostedZone for a AWS service itself that is managed by AWS, not an end-user. |

</details>

<details>
<summary><strong>IxWebsiteRedirect</strong> - Creates a redirect from one domain to another.</summary>

```typescript
import { IxWebsiteRedirect } from "@infoxchange/make-it-so/cdk-constructs";

new IxWebsiteRedirect(scope, "WebsiteRedirect", {
  recordNames: ["www.example.com", "othersubdomain.example.com"],
  targetDomain: "www.example.com",
});
```

#### Options:

| Prop         | Type                                                                                                             | Description                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| targetDomain | string                                                                                                           | The domain to redirect to                                                                     |
| recordNames  | string[]                                                                                                         | The domains to redirect from                                                                  |
| certificate  | [ICertificate](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.ICertificate.html) | (optional) The certificate to use when serving the redirect, one will be created if not given |

</details>

<details>
<summary><strong>IxVpcDetails</strong> - Fetches the standard VPC and subnets that exist in all IX workload aws accounts.</summary>

```typescript
import { IxVpcDetails } from "@infoxchange/make-it-so/cdk-constructs";

const vpcDetails = new IxVpcDetails(scope, "VpcDetails");
```

#### Options:

| Prop                    | Type     | Description                                                     |
| ----------------------- | -------- | --------------------------------------------------------------- |
| domainName              | string   | Domain name for cert                                            |
| subjectAlternativeNames | string[] | (optional) Any domains for the certs "Subject Alternative Name" |
| region                  | string   | (optional) The AWS region to create the cert in                 |

</details>

## Full Example

To deploy a Next.js based site you would include a `sst.config.ts` file at the root of repo with contents like this:

```typescript
import { SSTConfig } from "sst";
import { IxNextjsSite } from "@infoxchange/make-it-so/cdk-constructs";
import deployConfig from "@infoxchange/make-it-so/deployConfig";

export default {
  config: () => ({
    name: deployConfig.appName || "fallback-app-name",
    region: deployConfig.primaryAwsRegion,
  }),
  stacks(app) {
    app.stack(
      ({ stack }) => {
        const site = new IxNextjsSite(stack, "site", {
          environment: {
            DATABASE_URL: process.env.DATABASE_URL || "",
            SESSION_SECRET: process.env.SESSION_SECRET || "",
          },
        });

        stack.addOutputs({
          SiteUrl: site.primaryOrigin,
        });
      },
      { stackName: `${app.name}-${app.stage}` }, // Use the same stack name format as our docker apps
    );
  },
} satisfies SSTConfig;
```

Then simply configure the IX pipeline to deploy that repo as a serverless app.

important that sst and aws lib version match those used in ix-deploy-support

# The Name

Honestly I've never seen Star Trek but I figured the name is appropriate since the goal of this library is to allow you, the user, to deploy applications by stating what you want and letting someone else handle the nitty gritty details of how to actually implement it.

# Development and Contributing

Changes to the main branch automatically trigger the CI to build and publish to npm. We do this with [semantic-release](https://semantic-release.gitbook.io/) which uses commit messages to determine what the new version number should be.

Commit messages must be formatted in the [Conventional Commits](https://www.conventionalcommits.org) style to allow semantic-release to generate release notes based on the git history. To help with this the CLI tool for creating a commit with a valid commit message can be used via `npm run commit`.

If adding a new construct the easiest way to develop it maybe by building it in whatever app repo it is intended to be used in. When it appears to be working correctly it can be moved into make-it-so and the app can be updated to import that construct from make-it-so.

To test change a change in make-it-so create a branch starting with the prefix "internal-testing-". When pushed the CI will release a new package with a pre-release version. It'll look a little something like `2.1.3-internal-testing-name-of-feature.3`. A serverless app using make-it-so can be modified to use this package version and then deployed to a dev environment to test that the make-it-so changes are functioning correctly. Once a change has been merged into main and there are no serverless apps using the pre-release package any more it's a good idea to [delete that version](https://docs.npmjs.com/unpublishing-packages-from-the-registry#unpublishing-a-single-version-of-a-package) to keep the [npm package version history clean](https://www.npmjs.com/package/@infoxchange/make-it-so?activeTab=versions).
