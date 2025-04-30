import { Construct } from "constructs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { CustomResource } from "aws-cdk-lib";

type ConstructScope = ConstructorParameters<typeof Construct>[0];
type ConstructId = ConstructorParameters<typeof Construct>[1];

type Props = {
  appName: string;
  dataBuckets: string[];
};

export class IxQuicksightWorkspace extends Construct {
  workspaceBucketName: string;
  athenaWorkgroupName: string;
  serviceRoleArn: string;
  glueDatabaseName: string;
  quickSightDataSourceId: string;

  constructor(scope: ConstructScope, id: ConstructId, props: Props) {
    super(scope, id);
    const qsWorkspaceSetupLambdaArn = StringParameter.valueForStringParameter(
      scope,
      "/shared-services/quicksight-workspace/lambdaArn",
    );

    const quicksightWorkspaceLambda = new CustomResource(
      scope,
      id + "-CustomResource",
      {
        resourceType: "Custom::QuicksightWorkspace",
        serviceToken: qsWorkspaceSetupLambdaArn,
        properties: {
          app_name: props.appName,
          data_buckets: props.dataBuckets,
        },
      },
    );

    this.workspaceBucketName = quicksightWorkspaceLambda.getAttString(
      "WorkspaceBucketName",
    );
    this.athenaWorkgroupName = quicksightWorkspaceLambda.getAttString(
      "AthenaWorkgroupName",
    );
    this.serviceRoleArn =
      quicksightWorkspaceLambda.getAttString("ServiceRoleArn");
    this.glueDatabaseName =
      quicksightWorkspaceLambda.getAttString("GlueDatabaseName");
    this.quickSightDataSourceId = quicksightWorkspaceLambda.getAttString(
      "QuickSightDataSourceId",
    );
  }
}
