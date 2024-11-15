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
  constructor(scope: ConstructScope, id: ConstructId, props: Props) {
    super(scope, id);
    this.createQuicksightWorkspace(scope, id, props);
  }

  private createQuicksightWorkspace(
    scope: ConstructScope,
    id: ConstructId,
    constructProps: Props,
  ): void {
    const qsWorkspaceSetupLambdaArn = StringParameter.valueForStringParameter(
      scope,
      "/shared-services/quicksight-workspace/lambdaArn",
    );

    new CustomResource(scope, id + "-CustomResource", {
      resourceType: "Custom::QuicksightWorkspace",
      serviceToken: qsWorkspaceSetupLambdaArn,
      properties: {
        app_name: constructProps.appName,
        data_buckets: constructProps.dataBuckets,
      },
    });
  }
}
