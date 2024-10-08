# Make It So

[![NPM Version](https://img.shields.io/npm/v/%40infoxchange%2Fmake-it-so)](https://www.npmjs.com/package/@infoxchange/make-it-so)

A helpful little library that allows you to deploy apps on Infoxchange's (IX) infrastructure without having to specify all the implementation details that are specific to IX's deployment environment. You tell it what you want and it will worry about making it happen. Most of the heavily lifting is done by [SST](https://sst.dev/) which is extending to take care the IX related specifics.

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

| Name             | Description                          | Type for IX Deploy | Type for non-IX Deploy |
| ---------------- | ------------------------------------ | ------------------ | ---------------------- |
| isIxDeploy       | Is deploying via IX pipeline or not  | true               | false                  |
| appName          | Name of app being deployed           | string             | undefined              |
| environment      | Name of env app is being deployed to | string             | undefined              |
| workloadGroup    | The workload group of the app        | string             | undefined              |
| primaryAwsRegion | AWS Region used by IX                | string             | undefined              |
| siteDomains      | Domains to be used by the app        | string[]           | []                     |

### CDK Construct - IxNextjsSite

Deploys a serverless instance of a Next.js. IxNextjsSite extends [SST's NextjsSite](https://docs.sst.dev/constructs/NextjsSite) and takes the exact same props.

It will automatically create certificates and DNS records for any custom domains given (including alternative domain names which SST doesn't currently do). If the props `customDomain` is not set the first site domain provided by the IX deployment pipeline will be used as the primary custom domain and if there is more than one domain the rest will be used as alternative domain names. Explicitly setting `customDomain` to `undefined` will ensure no customDomain is used.

It will also automatically attach the site to the standard IX VPC created in each workload account (unless you explicitly pass other VPC details or set the VPC-related props (see the SST doco) to `undefined`).

```typescript
import { IxNextjsSite } from "@infoxchange/make-it-so/cdk-constructs";

const site = new IxNextjsSite(stack, "Site", {
  environment: {
    DATABASE_URL: process.env.DATABASE_URL || "",
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  },
  // Included by default:
  // customDomain: {
  //   domainName: ixDeployConfig.siteDomains[0],
  //   alternateNames: ixDeployConfig.siteDomains.slice(1)
  // },
});
```

### CDK Construct - IxApi

Deploys an instance of API Gateway. IxApi extends [SST's Api](https://docs.sst.dev/constructs/Api) and takes the exact same props.

It will automatically create certificates and DNS records for a single domain that the API should deploy to. If the props `customDomain` is not set the first site domain provided by the IX deployment pipeline will be used as the domain. Explicitly setting `customDomain` to `undefined` will ensure no customDomain is used. Regardless of if a custom domain is set, the API Gateway will still be accessible via the 'api-id.execute-api.region.amazonaws.com' url.

```typescript
import { IxApi } from "@infoxchange/make-it-so/cdk-constructs";

const site = new IxApi(stack, "api", {
  // Included by default:
  // customDomain: {
  //   domainName: ixDeployConfig.siteDomains[0],
  // },
});
```

### CDK Construct - IxElasticache

Deploys an AWS Elasticache cluster, either the redis or the memcached flavour.

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

### CDK Construct - IxCertificate

Creates a new DNS validated ACM certificate for a domain managed by IX.

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

### CDK Construct - IxDnsRecord

Creates a DNS record for a domain managed by IX. Route53 HostedZones for IX managed domains live in the dns-hosting AWS account so if a workload AWS account requires a DNS record to be created this must be done "cross-account". IxDnsRecord handles that part for you. Just give it the details for the DNS record itself and IxDnsRecord will worry about creating it.

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

### CDK Construct - IxVpcDetails

Fetches the standard VPC and subnets that exist in all IX workload aws accounts.

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
