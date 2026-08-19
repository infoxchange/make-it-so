import { Construct } from "constructs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Vpc, IVpc } from "aws-cdk-lib/aws-ec2";
import ixDeployConfig from "../deployConfig.js";

type ConstructScope = ConstructorParameters<typeof Construct>[0];
type ConstructId = ConstructorParameters<typeof Construct>[1];

export class IxVpcDetails extends Construct {
  public vpc: IVpc;

  constructor(scope: ConstructScope, id: ConstructId) {
    super(scope, id);
    this.vpc = this.getVpc(scope, id);
  }

  private getVpc(scope: ConstructScope, id: ConstructId): IVpc {
    const vpcId = StringParameter.valueForStringParameter(scope, "/vpc/id");
    return Vpc.fromVpcAttributes(this, id + "-Vpc", {
      vpcId,
      availabilityZones: [
        "ap-southeast-2a",
        "ap-southeast-2b",
        "ap-southeast-2c",
      ],
      isolatedSubnetIds: IxVpcDetails.getVpcSubnetIds(scope),
    });
  }

  static getVpcSubnetIds(scope: ConstructScope): Array<string> {
    const { workloadGroup, appName } = ixDeployConfig;
    let suffix = "";
    if (workloadGroup === "ds") {
      const possibleSuffixes = ["", "-2"];
      // Randomly select a suffix to spread workload's IP usage across both sets of subnets. Use the app name as a seed
      // to ensure consistent selection on redeploys.
      const hash = appName
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      suffix = possibleSuffixes[hash % possibleSuffixes.length];
    }
    return [1, 2, 3].map((subnetNum) =>
      StringParameter.valueForStringParameter(
        scope,
        `/vpc/subnet/private-${workloadGroup}${suffix}/${subnetNum}/id`,
      ),
    );
  }
}
