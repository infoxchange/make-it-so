type IxDeployConfig =
  | {
      isIxDeploy: true;
      appName: string;
      environment: string;
      workloadGroup: string;
      primaryAwsRegion: string;
      siteDomains: string[];
    }
  | {
      isIxDeploy: false;
      appName: undefined;
      environment: undefined;
      workloadGroup: undefined;
      primaryAwsRegion: undefined;
      siteDomains: [];
    };

export default {
  isIxDeploy: Boolean(process.env.IX_DEPLOYMENT),
  appName: process.env.IX_APP_NAME,
  environment: process.env.IX_ENVIRONMENT,
  workloadGroup: process.env.IX_WORKLOAD_GROUP,
  primaryAwsRegion: process.env.IX_PRIMARY_AWS_REGION,
  siteDomains: (process.env.IX_SITE_DOMAINS || "")
    .split(",")
    .map((domain) => domain.trim()),
} as IxDeployConfig;
