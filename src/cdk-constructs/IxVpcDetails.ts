import { Construct } from "constructs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Vpc, IVpc, SubnetSelection, SubnetFilter } from "aws-cdk-lib/aws-ec2";
import ixDeployConfig from "../deployConfig.js";

type ConstructScope = ConstructorParameters<typeof Construct>[0];
type ConstructId = ConstructorParameters<typeof Construct>[1];

export class IxVpcDetails extends Construct {
  public vpc: IVpc;
  public vpcSubnets: SubnetSelection;

  constructor(scope: ConstructScope, id: ConstructId) {
    super(scope, id);
    this.vpc = this.getVpc(scope, id);
    this.vpcSubnets = this.getVpcSubnet(scope);
  }

  private getVpc(scope: ConstructScope, id: ConstructId): IVpc {
    const vpcId = StringParameter.valueFromLookup(scope, "/vpc/id");
    return Vpc.fromLookup(scope, id + "-Vpc", { vpcId });
  }

  private getVpcSubnet(scope: ConstructScope): SubnetSelection {
    const vpcSubnetIds = [1, 2, 3].map((subnetNum) =>
      StringParameter.valueForStringParameter(
        scope,
        `/vpc/subnet/private-${ixDeployConfig.workloadGroup}/${subnetNum}/id`,
      ),
    );
    return {
      subnetFilters: [SubnetFilter.byIds(vpcSubnetIds)],
    };
  }
}
