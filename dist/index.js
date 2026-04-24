var __defProp = Object.defineProperty;
var __export = (target, all3) => {
  for (var name in all3)
    __defProp(target, name, { get: all3[name], enumerable: true });
};

// src/deployConfig.ts
import { z } from "zod";
var getEnvVars = () => ({
  isIxDeploy: process.env.IX_DEPLOYMENT?.toLowerCase() === "true",
  // This needs to start as a bool for the discriminated union
  appName: process.env.IX_APP_NAME ?? "",
  environment: process.env.IX_ENVIRONMENT ?? "",
  workloadGroup: process.env.IX_WORKLOAD_GROUP ?? "",
  primaryAwsRegion: process.env.IX_PRIMARY_AWS_REGION ?? "",
  siteDomains: process.env.IX_SITE_DOMAINS ?? "",
  siteDomainAliases: process.env.IX_SITE_DOMAIN_ALIASES ?? "",
  isInternalApp: process.env.IX_INTERNAL_APP ?? "",
  deploymentType: process.env.IX_DEPLOYMENT_TYPE ?? "",
  sourceCommitRef: process.env.IX_SOURCE_COMMIT_REF ?? "",
  sourceCommitHash: process.env.IX_SOURCE_COMMIT_HASH ?? "",
  deployTriggeredBy: process.env.IX_DEPLOY_TRIGGERED_BY ?? "",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: process.env.SMTP_PORT ?? "",
  clamAVUrl: process.env.CLAMAV_URL ?? "",
  vpcHttpProxy: process.env.VPC_HTTP_PROXY ?? "",
  alarmSnsTopic: process.env.IX_ALARM_SNS_TOPIC ?? "",
  tags: JSON.parse(process.env.IX_TAGS ?? "{}")
});
var ixDeployConfigSchema = z.object({
  isIxDeploy: z.literal(true),
  appName: z.string().min(1),
  environment: z.enum(["dev", "test", "uat", "prod"]),
  workloadGroup: z.enum(["ds", "srs"]),
  primaryAwsRegion: z.literal("ap-southeast-2"),
  siteDomains: z.string().transform((val) => val.split(",").map((domain) => domain.trim()).filter(Boolean)),
  siteDomainAliases: z.string().transform((val) => val.split(",").map((domain) => domain.trim()).filter(Boolean)),
  isInternalApp: z.coerce.boolean(),
  deploymentType: z.enum(["docker", "serverless"]),
  sourceCommitRef: z.string().min(1),
  sourceCommitHash: z.string().min(1),
  deployTriggeredBy: z.string().min(1),
  smtpHost: z.string(),
  smtpPort: z.coerce.number().int(),
  clamAVUrl: z.string().url(),
  vpcHttpProxy: z.string().url(),
  alarmSnsTopic: z.string().min(1),
  tags: z.record(z.string(), z.string())
}).strip();
var nonIxDeployConfigSchema = z.object({
  isIxDeploy: z.literal(false),
  appName: z.string(),
  environment: z.string(),
  workloadGroup: z.string(),
  primaryAwsRegion: z.string(),
  siteDomains: z.string().transform((val) => val.split(",").map((domain) => domain.trim()).filter(Boolean)),
  siteDomainAliases: z.string().transform((val) => val.split(",").map((domain) => domain.trim()).filter(Boolean)),
  isInternalApp: z.string().transform((val) => val ? val.toLowerCase() === "true" : void 0),
  deploymentType: z.string(),
  sourceCommitRef: z.string(),
  sourceCommitHash: z.string(),
  deployTriggeredBy: z.string(),
  smtpHost: z.string(),
  smtpPort: z.string().transform((val) => isNaN(parseInt(val, 10)) ? void 0 : parseInt(val, 10)),
  clamAVUrl: z.string(),
  vpcHttpProxy: z.string(),
  alarmSnsTopic: z.string(),
  tags: z.record(z.string(), z.string())
}).strip();
var schema = z.discriminatedUnion("isIxDeploy", [
  ixDeployConfigSchema,
  nonIxDeployConfigSchema
]);
var deployConfig = schema.parse(getEnvVars());
var getDeployConfig = () => schema.parse(getEnvVars());

// src/components/ix/index.ts
var ix_exports = {};
__export(ix_exports, {
  InternalNetwork: () => InternalNetwork,
  dns: () => dns
});

// ../../../../../../../../../Users/callumgare/repos/make-it-so/node_modules/sst3/platform/src/components/naming.ts
function logicalName(name) {
  name = name.replace(/[^a-zA-Z0-9]/g, "");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// src/components/ix/dns.ts
import { output as output2 } from "@pulumi/pulumi";

// ../../../../../../../../../Users/callumgare/repos/make-it-so/node_modules/sst3/platform/src/components/component.ts
import { ComponentResource, runtime, output, asset as pulumiAsset, all } from "@pulumi/pulumi";

// ../../../../../../../../../Users/callumgare/repos/make-it-so/node_modules/sst3/platform/src/components/error.ts
var VisibleError = class extends Error {
  constructor(...message) {
    super(message.join("\n"));
  }
};

// ../../../../../../../../../Users/callumgare/repos/make-it-so/node_modules/sst3/platform/src/components/component.ts
function transform(transform2, name, args, opts) {
  if (typeof transform2 === "function") {
    transform2(args, opts, name);
    return [name, args, opts];
  }
  return [name, { ...args, ...transform2 }, opts];
}

// ../../../../../../../../../Users/callumgare/repos/make-it-so/node_modules/sst3/platform/src/components/aws/helpers/provider.ts
import { runtime as runtime2 } from "@pulumi/pulumi";
import { Provider } from "@pulumi/aws";

// ../../../../../../../../../Users/callumgare/repos/make-it-so/node_modules/sst3/platform/src/util/lazy.ts
function lazy(callback) {
  let loaded = false;
  let result;
  return () => {
    if (!loaded) {
      loaded = true;
      result = callback();
    }
    return result;
  };
}

// ../../../../../../../../../Users/callumgare/repos/make-it-so/node_modules/sst3/platform/src/components/aws/helpers/provider.ts
var useProviderCache = lazy(() => /* @__PURE__ */ new Map());
var useProvider = (region) => {
  const cache = useProviderCache();
  const existing = cache.get(region);
  if (existing)
    return existing;
  const config = runtime2.allConfig();
  for (const key in config) {
    const value = config[key];
    delete config[key];
    const [prefix, real] = key.split(":");
    if (prefix !== "aws")
      continue;
    try {
      config[real] = JSON.parse(value);
    } catch (e) {
      config[real] = value;
    }
  }
  const provider = new Provider(`AwsProvider.sst.${region}`, {
    ...config,
    region
  });
  cache.set(region, provider);
  return provider;
};

// src/components/ix/dns.ts
import * as awsSdk from "@pulumi/aws";
function dns(args = {}) {
  return {
    provider: "aws",
    createAlias,
    createCaa,
    createRecord
  };
  function createAlias(namePrefix, record, opts) {
    return ["A", "AAAA"].map((type) => _createRecord(namePrefix, {
      type,
      name: record.name,
      aliases: [
        {
          name: record.aliasName,
          zoneId: record.aliasZone,
          evaluateTargetHealth: true
        }
      ]
    }, opts));
  }
  function createCaa(namePrefix, recordName, opts) {
    return void 0;
  }
  function createRecord(namePrefix, record, opts) {
    return _createRecord(namePrefix, {
      type: record.type,
      name: record.name,
      ttl: 60,
      records: [record.value]
    }, opts);
  }
  function _createRecord(namePrefix, partial, opts) {
    return output2(partial).apply((partial2) => {
      const nameSuffix = logicalName(partial2.name);
      const zoneId = "";
      const dnsRecord = createRecord2();
      return dnsRecord;
      function createRecord2() {
        const [name, mergedArgs, mergedOpts] = transform(args.transform?.record, `${namePrefix}${partial2.type}Record${nameSuffix}`, {
          zoneId,
          allowOverwrite: args.override,
          ...partial2
        }, opts);
        const lambdaInput = output2(mergedArgs).apply((mergedArgs2) => {
          const { aliases } = mergedArgs2;
          let { aliasIpType } = mergedArgs2;
          if (aliases && aliases.length > 1) {
            throw new VisibleError("Aliases with multiple targets are not supported");
          }
          const [alias] = aliases || [];
          if (alias) {
            if (mergedArgs2.type === "A") {
              aliasIpType = "IPv4";
            } else if (mergedArgs2.type === "AAAA") {
              aliasIpType = "IPv6";
            } else {
              throw new VisibleError("Alias records can only be created for A or AAAA record types");
            }
          }
          return {
            RecordType: mergedArgs2.type,
            // Even though a trailing dot is valid a bug in the IX dns lambda means that an error occurs
            // when trying to find the hosted zone if there is a trailing dot.
            RecordFQDN: mergedArgs2.name.replace(/\.$/, ""),
            // If giving the IX dns lambda multiple values we need to wrap in 'Value' objects
            // unlike for single values where the lambda does it for us
            // https://github.com/InfoxchangeTS/aws-gov/blob/213609c2e91b021375b93290efdaf38936ee98e1/components/xaccount-route53/dns-record-updater-lambda/src/index.py#L133
            RecordValue: mergedArgs2.records?.map((value) => ({ Value: value })),
            ...mergedArgs2.zoneId ? { HostedZoneId: mergedArgs2.zoneId } : {},
            ...mergedArgs2.ttl ? { RecordTTL: mergedArgs2.ttl } : {},
            ...alias ? {
              RecordType: "ALIAS",
              // https://github.com/InfoxchangeTS/aws-gov/blob/213609c2e91b021375b93290efdaf38936ee98e1/components/xaccount-route53/dns-record-updater-lambda/src/index.py#L145
              RecordValue: alias.name,
              // https://github.com/InfoxchangeTS/aws-gov/blob/213609c2e91b021375b93290efdaf38936ee98e1/components/xaccount-route53/dns-record-updater-lambda/src/index.py#L144
              AliasZoneId: alias.zoneId,
              // alias.evaluateTargetHealth can't be set by the lambda
              IpAddressType: aliasIpType?.toLowerCase()
            } : {},
            ...mergedArgs2.lambdaInput
          };
        });
        return new awsSdk.lambda.Invocation(name, {
          input: output2(lambdaInput).apply((lambdaInput2) => JSON.stringify({
            RequestType: "Create",
            ResourceProperties: lambdaInput2,
            // We need some value so that the lambda doesn't throw an error but we don't want the lambda to actually
            // send a response to this url (the response is for CloudFormation which we're not using). Setting an
            // invalid domain will cause it to log an error but not throw so the lambda is considered successful.
            ResponseURL: "invalid://make-it-so-dns",
            StackId: "",
            RequestId: "",
            LogicalResourceId: ""
          })),
          functionName: awsSdk.ssm.getParameter({
            name: "/shared-services/route53/lambdaArn"
          }).then((param) => param.value)
        }, {
          ...mergedOpts,
          // Function can only be invoked from within the same region it is deployed
          provider: useProvider("ap-southeast-2")
        });
      }
    });
  }
}

// src/components/ix/InternalNetwork.ts
import * as pulumi from "@pulumi/pulumi";
import * as awsSdk2 from "@pulumi/aws";
import { deployConfig as deployConfig2 } from "@infoxchange/make-it-so";
var InternalNetwork = class _InternalNetwork extends pulumi.ComponentResource {
  vpc;
  subnetIds;
  securityGroup;
  constructor(name, args = {}, opts) {
    super("ix:aws:InternalNetwork", name, args, opts);
    const vpcIdParam = awsSdk2.ssm.getParameterOutput({
      name: "/vpc/id"
    }, { parent: this });
    const vpcId = vpcIdParam.value;
    this.vpc = vpcId.apply(async (vpcId2) => await awsSdk2.ec2.getVpc({ id: vpcId2 }));
    this.subnetIds = _InternalNetwork.getVpcSubnetIds();
    this.securityGroup = this.vpc.apply((vpc) => this.createSecurityGroup({
      parentName: name,
      vpc,
      args: args.transform?.securityGroup,
      opts: { parent: this }
    }));
    this.registerOutputs({
      vpc: this.vpc,
      subnetIds: this.subnetIds
    });
  }
  get securityGroupIds() {
    return pulumi.output(this.securityGroup).apply((sg) => [sg.id]);
  }
  static getVpcSubnetIds() {
    const { workloadGroup, appName } = deployConfig2;
    let suffix = "";
    if (workloadGroup === "ds") {
      const possibleSuffixes = ["", "-2"];
      const hash = appName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      suffix = possibleSuffixes[hash % possibleSuffixes.length];
    }
    const subnetOutputs = [1, 2, 3].map((subnetNum) => awsSdk2.ssm.getParameterOutput({
      name: `/vpc/subnet/private-${workloadGroup}${suffix}/${subnetNum}/id`
    }).value);
    return pulumi.all(subnetOutputs);
  }
  // Based on https://github.com/anomalyco/sst/blob/3407c32b2cf97b85ea96a92361c6f4a0a8d55200/platform/src/components/aws/vpc.ts#L840
  createSecurityGroup({ parentName, vpc, args, opts }) {
    return new awsSdk2.ec2.SecurityGroup(...transform(args, `${parentName}SecurityGroup`, {
      description: "Managed by make-it-so",
      vpcId: vpc.id,
      egress: [
        {
          fromPort: 0,
          toPort: 0,
          protocol: "-1",
          cidrBlocks: ["0.0.0.0/0"]
        }
      ],
      ingress: [
        {
          fromPort: 0,
          toPort: 0,
          protocol: "-1",
          // Restricts inbound traffic to only within the VPC
          cidrBlocks: [vpc.cidrBlock]
        }
      ]
    }, opts));
  }
};

// src/components/setup-components.ts
import { output as output4 } from "@pulumi/pulumi";
import { getDeployConfig as getDeployConfig2 } from "@infoxchange/make-it-so";
function setup() {
  const siteConstructs = [
    sst.aws.StaticSite,
    sst.aws.Nextjs,
    sst.aws.Nuxt,
    sst.aws.Remix,
    sst.aws.React,
    sst.aws.TanStackStart,
    sst.aws.Astro,
    sst.aws.SvelteKit,
    sst.aws.SolidStart,
    sst.aws.Analog
  ];
  for (const construct of siteConstructs) {
    $transform(construct, (args, opts, name) => {
      addDefaultDomain(args, name);
    });
  }
  function addDefaultDomain(args, name) {
    if (!args) {
      throw new Error(`No args provided to ${name}`);
    }
    const domainArgs = {
      name: getDeployConfig2().siteDomains[0],
      dns: ix_exports.dns()
    };
    if (!("domain" in args)) {
      args.domain = domainArgs;
    } else if (args.domain) {
      args.domain = output4(args.domain).apply((domain) => {
        if (typeof domain === "string") {
          return {
            name: domain,
            dns: domainArgs.dns
          };
        } else if (!("dns" in domain)) {
          domain.dns = domainArgs.dns;
        }
        return domain;
      });
    }
  }
}

// src/lib/proxy/fetch.ts
import { setGlobalDispatcher, getGlobalDispatcher, EnvHttpProxyAgent, fetch as undiciFetch } from "undici";
import { bootstrap } from "global-agent";
function setupProxyGlobally() {
  if (getGlobalDispatcher() instanceof EnvHttpProxyAgent)
    return;
  if (!process.env.HTTP_PROXY || !process.env.HTTPS_PROXY)
    return;
  const envHttpProxyAgent = new EnvHttpProxyAgent();
  setGlobalDispatcher(envHttpProxyAgent);
  if (!process.env.GLOBAL_AGENT_HTTP_PROXY) {
    process.env.GLOBAL_AGENT_HTTP_PROXY = process.env.HTTP_PROXY;
    process.env.GLOBAL_AGENT_HTTPS_PROXY = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
  }
  bootstrap();
}
function getProxiedFetch() {
  const fetch = (input, init = {}) => {
    if (init.dispatcher) {
      console.warn("A custom dispatcher was provided to fetch but this is ignored as a proxy agent is being used.");
    }
    const envHttpProxyAgent = new EnvHttpProxyAgent();
    return undiciFetch(input, { ...init, dispatcher: envHttpProxyAgent });
  };
  return fetch;
}
export {
  deployConfig,
  getDeployConfig,
  getProxiedFetch,
  setup,
  setupProxyGlobally
};
//# sourceMappingURL=index.js.map
