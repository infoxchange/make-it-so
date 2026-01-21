# Make It So

[![NPM Version](https://img.shields.io/npm/v/%40infoxchange%2Fmake-it-so)](https://www.npmjs.com/package/@infoxchange/make-it-so)

A helpful little library that allows you to deploy apps on Infoxchange's (IX) infrastructure without having to specify all the implementation details that are specific to IX's deployment environment. You tell it what you want and it will worry about making it happen. Most of the heavily lifting is done by [SST](https://sst.dev) which is extending to take care the IX related specifics.

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
import { deployConfig, getDeployConfig } from "@infoxchange/make-it-so";

if (deployConfig.isIxDeploy) {
  console.log(
    `Deploying ${deployConfig.appName} into ${deployConfig.environment}`,
  );
} else {
  console.log(`Not deploying via the IX deploy pipeline`);
}

// Will return the same object but calculated when the function is run rather than when imported. Useful if any IX
// deployment related environment variables are changed at runtime.
console.log(getDeployConfig());
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

### IX Customisations of SST Components

To make [SST components](https://sst.dev/docs/) more inline with Infoxchange's infrastructure architecture add the
following to the start of an `sst.config.ts`'s `run()` function:

```typescript
await import("@infoxchange/make-it-so/components").then((module) =>
  module.setup(),
);
```

The changes made by `setup()` takes the form of setting sensible (for an IX context) defaults for the
accepted args of those components. These changes include:

- If a domain is not provided for site components like StaticSite or NextjsSite the domain will automatically be set to
  `deployConfig.siteDomains[0]`.

If you want the SST default behaviour instead of the Make It So modified default behaviour you can set the relevant
args to `undefined`. For example if you don't want a StaticSite component to have the domain set to
`deployConfig.siteDomains[0]` and instead use the randomly assigned CloudFront domain then you can use `new
StaticSite("Site", {domain: undefined})`.

### Additional SST-compatible Components

<details>
<summary><strong>InternalNetwork</strong> - Gets details for the existing private IX VPC and sets up a new security group.</summary>

```typescript
import { ix } from "@infoxchange/make-it-so/components";

const internalNetwork = new ix.InternalNetwork("IxVPC");
```

#### Options:

None

#### Properties:

| Properties       | Type                                                                                              | Description                              |
| ---------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| subnetIds        | string[]                                                                                          | Subnet ids to be used with the VPC       |
| securityGroup    | [aws.ec2.SecurityGroup](https://www.pulumi.com/registry/packages/aws/api-docs/ec2/securitygroup/) | A security group to be used with the VPC |
| securityGroupIds | string[]                                                                                          | An array with the id for securityGroup   |

</details>

## Example App Using Make It So

To deploy lambda inside the IX VPC and a static site you would include a `sst.config.ts` file at the root of repo with contents like this:

```typescript
/// <reference path="./.sst/platform/config.d.ts" />

const { deployConfig } = await import("@infoxchange/make-it-so");

export default $config({
  async app(input) {
    return {
      name: deployConfig.appName || "fallback-app-name",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    // Apply Make It So customisations to SST components
    await import("@infoxchange/make-it-so").then((module) => module.setup());

    // Create a new static site
    new sst.aws.StaticSite("MySite", {
      path: "site",
    });

    // Create a new lambda that is inside the IX VPC
    const { ix } = await import("@infoxchange/make-it-so/components");
    const internalNetwork = new ix.InternalNetwork("MyInternalNetwork");
    new sst.aws.Function("MyFunction", {
      handler: "src/lambda.handler",
      vpc: {
        privateSubnets: internalNetwork.subnetIds,
        securityGroups: internalNetwork.securityGroupIds,
      },
    });
  },
});
```

`sst deploy` has to be run at least once locally so that SST will create `./.sst/platform/config.d.ts` (you can deploy
it to the `ds-poc-dev` account for testing and remove it later with `sst remove`).

# The Name

Honestly I've never seen Star Trek but I figured the name is appropriate since the goal of this library is to allow you, the user, to deploy applications by stating what you want and letting someone else handle the nitty gritty details of how to actually implement it.

# Development and Contributing

Changes to the main branch automatically trigger the CI to build and publish to npm. We do this with [semantic-release](https://semantic-release.gitbook.io/) which uses commit messages to determine what the new version number should be.

Commit messages must be formatted in the [Conventional Commits](https://www.conventionalcommits.org) style to allow semantic-release to generate release notes based on the git history. To help with this the CLI tool for creating a commit with a valid commit message can be used via `npm run commit`.

If adding a new component I've found that the easiest way to develop it is by first building it in whatever app repo it
is intended to be used in. When it appears to be working correctly it can be moved into the make-it-so repos and the app can
be updated to import that component from make-it-so.

To test change a change in make-it-so create a branch starting with the prefix "internal-testing-". When pushed the CI will release a new package with a pre-release version. It'll look a little something like `2.1.3-internal-testing-name-of-feature.3`. A serverless app using make-it-so can be modified to use this package version and then deployed to a dev environment to test that the make-it-so changes are functioning correctly. Once a change has been merged into main and there are no serverless apps using the pre-release package any more it's a good idea to [delete that version](https://docs.npmjs.com/unpublishing-packages-from-the-registry#unpublishing-a-single-version-of-a-package) to keep the [npm package version history clean](https://www.npmjs.com/package/@infoxchange/make-it-so?activeTab=versions).
