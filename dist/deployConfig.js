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
export {
  deployConfig,
  getDeployConfig
};
//# sourceMappingURL=deployConfig.js.map
