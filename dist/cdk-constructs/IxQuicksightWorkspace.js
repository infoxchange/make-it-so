import { Construct } from "constructs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { CustomResource } from "aws-cdk-lib";
export class IxQuicksightWorkspace extends Construct {
    workspaceBucketName;
    athenaWorkgroupName;
    serviceRoleArn;
    glueDatabaseName;
    quickSightDataSourceId;
    constructor(scope, id, props) {
        super(scope, id);
        const qsWorkspaceSetupLambdaArn = StringParameter.valueForStringParameter(scope, "/shared-services/quicksight-workspace/lambdaArn");
        const quicksightWorkspaceLambda = new CustomResource(scope, id + "-CustomResource", {
            resourceType: "Custom::QuicksightWorkspace",
            serviceToken: qsWorkspaceSetupLambdaArn,
            properties: {
                app_name: props.appName,
                data_buckets: props.dataBuckets,
            },
        });
        this.workspaceBucketName = quicksightWorkspaceLambda.getAttString("WorkspaceBucketName");
        this.athenaWorkgroupName = quicksightWorkspaceLambda.getAttString("AthenaWorkgroupName");
        this.serviceRoleArn =
            quicksightWorkspaceLambda.getAttString("ServiceRoleArn");
        this.glueDatabaseName =
            quicksightWorkspaceLambda.getAttString("GlueDatabaseName");
        this.quickSightDataSourceId = quicksightWorkspaceLambda.getAttString("QuickSightDataSourceId");
    }
}
