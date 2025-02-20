type SharedDeployConfig = {
  appName: string;
  environment: string;
  workloadGroup: string;
  primaryAwsRegion: string;
  siteDomains: string[];
  isInternalApp: boolean;
  deploymentType: string;
  sourceCommitRef: string;
  sourceCommitHash: string;
  deployTriggeredBy: string;
  smtpHost: string;
  smtpPort: string;
  clamavUrl: string;
};

export type IxDeployConfig =
  | ({ isIxDeploy: true } & SharedDeployConfig)
  | ({ isIxDeploy: false } & Partial<SharedDeployConfig>);

export default {
  isIxDeploy: process.env.IX_DEPLOYMENT?.toLowerCase() === "true",
  appName: process.env.IX_APP_NAME,
  environment: process.env.IX_ENVIRONMENT,
  workloadGroup: process.env.IX_WORKLOAD_GROUP,
  primaryAwsRegion: process.env.IX_PRIMARY_AWS_REGION,
  siteDomains: (process.env.IX_SITE_DOMAINS || "")
    .split(",")
    .map((domain) => domain.trim()),
  isInternalApp: process.env.IX_INTERNAL_APP?.toLowerCase() === "true",
  deploymentType: process.env.IX_DEPLOYMENT_TYPE,
  sourceCommitRef: process.env.IX_SOURCE_COMMIT_REF,
  sourceCommitHash: process.env.IX_SOURCE_COMMIT_HASH,
  deployTriggeredBy: process.env.IX_DEPLOY_TRIGGERED_BY,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  clamavUrl: process.env.CLAMAV_URL,
} as IxDeployConfig;
