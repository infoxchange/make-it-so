import { z } from "zod";

const envVars = {
  isIxDeploy: (process.env.IX_DEPLOYMENT ?? "").toLowerCase() === "true", // This needs to start as a bool for the discriminated union
  appName: process.env.IX_APP_NAME ?? "",
  environment: process.env.IX_ENVIRONMENT ?? "",
  workloadGroup: process.env.IX_WORKLOAD_GROUP ?? "",
  primaryAwsRegion: process.env.IX_PRIMARY_AWS_REGION ?? "",
  siteDomains: process.env.IX_SITE_DOMAINS ?? "",
  isInternalApp: process.env.IX_INTERNAL_APP ?? "",
  deploymentType: process.env.IX_DEPLOYMENT_TYPE ?? "",
  sourceCommitRef: process.env.IX_SOURCE_COMMIT_REF ?? "",
  sourceCommitHash: process.env.IX_SOURCE_COMMIT_HASH ?? "",
  deployTriggeredBy: process.env.IX_DEPLOY_TRIGGERED_BY ?? "",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: process.env.SMTP_PORT ?? "",
  clamAVUrl: process.env.CLAMAV_URL ?? "",
} satisfies Record<string, string | boolean>;

const ixDeployConfigSchema = z
  .object({
    isIxDeploy: z.literal(true),
    appName: z.string().min(1),
    environment: z.enum(["dev", "test", "uat", "prod"]),
    workloadGroup: z.enum(["ds", "srs"]),
    primaryAwsRegion: z.literal("ap-southeast-2"),
    siteDomains: z
      .string()
      .transform((val) => val.split(",").map((domain) => domain.trim())),
    isInternalApp: z.coerce.boolean(),
    deploymentType: z.enum(["docker", "serverless"]),
    sourceCommitRef: z.string().min(1),
    sourceCommitHash: z.string().min(1),
    deployTriggeredBy: z.string().min(1),
    smtpHost: z.string().min(1),
    smtpPort: z.coerce.number().int(),
    clamAVUrl: z.string().url(),
  } satisfies Record<keyof typeof envVars, unknown>)
  .strip();

const nonIxDeployConfigSchema = z
  .object({
    isIxDeploy: z.literal(false),
    appName: z.string(),
    environment: z.string(),
    workloadGroup: z.string(),
    primaryAwsRegion: z.string(),
    siteDomains: z
      .string()
      .transform((val) => val.split(",").map((domain) => domain.trim())),
    isInternalApp: z
      .string()
      .transform((val) => (val ? val.toLowerCase() === "true" : undefined)),
    deploymentType: z.string(),
    sourceCommitRef: z.string(),
    sourceCommitHash: z.string(),
    deployTriggeredBy: z.string(),
    smtpHost: z.string(),
    smtpPort: z
      .string()
      .transform((val) =>
        isNaN(parseInt(val, 10)) ? undefined : parseInt(val, 10),
      ),
    clamAVUrl: z.string(),
  } satisfies Record<keyof typeof envVars, unknown>)
  .strip();

const schema = z.discriminatedUnion("isIxDeploy", [
  ixDeployConfigSchema,
  nonIxDeployConfigSchema,
]);
export default schema.parse(envVars);

console.log(schema.parse(envVars));
