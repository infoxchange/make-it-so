import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import ixDeployConfig from "@/deployConfig";
import { Transform, transform } from "sst3/platform/src/components/component";

export interface InternalNetworkArgs {
  name?: string;
  transform?: {
    securityGroup?: Transform<aws.ec2.SecurityGroupArgs>;
  };
}

export class InternalNetwork extends pulumi.ComponentResource {
  public readonly vpc: pulumi.Output<aws.ec2.GetVpcResult>;
  public readonly subnetIds: pulumi.Output<string[]>;
  public readonly securityGroup: pulumi.Output<aws.ec2.SecurityGroup>;

  constructor(
    name: string,
    args: InternalNetworkArgs = {},
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super("ix:aws:InternalNetwork", name, args, opts);

    // Get VPC ID from SSM parameter
    const vpcIdParam = aws.ssm.getParameterOutput(
      {
        name: "/vpc/id",
      },
      { parent: this },
    );

    const vpcId = vpcIdParam.value;

    // Get VPC details
    this.vpc = vpcId.apply(
      async (vpcId) => await aws.ec2.getVpc({ id: vpcId }),
    );

    // Get subnet IDs
    this.subnetIds = InternalNetwork.getVpcSubnetIds();

    this.securityGroup = this.vpc.apply((vpc) =>
      this.createSecurityGroup({
        parentName: name,
        vpc: vpc,
        args: args.transform?.securityGroup,
        opts: { parent: this },
      }),
    );

    this.registerOutputs({
      vpc: this.vpc,
      subnetIds: this.subnetIds,
    });
  }

  public get securityGroupIds(): pulumi.Output<pulumi.Output<string>[]> {
    return pulumi.output(this.securityGroup).apply((sg) => [sg.id]);
  }

  static getVpcSubnetIds(): pulumi.Output<string[]> {
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

    const subnetOutputs = [1, 2, 3].map(
      (subnetNum) =>
        aws.ssm.getParameterOutput({
          name: `/vpc/subnet/private-${workloadGroup}${suffix}/${subnetNum}/id`,
        }).value,
    );

    return pulumi.all(subnetOutputs);
  }

  // Based on https://github.com/anomalyco/sst/blob/3407c32b2cf97b85ea96a92361c6f4a0a8d55200/platform/src/components/aws/vpc.ts#L840
  createSecurityGroup({
    parentName,
    vpc,
    args,
    opts,
  }: {
    parentName: string;
    vpc: aws.ec2.GetVpcResult;
    args?: Transform<aws.ec2.SecurityGroupArgs>;
    opts: pulumi.ComponentResourceOptions;
  }) {
    return new aws.ec2.SecurityGroup(
      ...transform(
        args,
        `${parentName}SecurityGroup`,
        {
          description: "Managed by make-it-so",
          vpcId: vpc.id,
          egress: [
            {
              fromPort: 0,
              toPort: 0,
              protocol: "-1",
              cidrBlocks: ["0.0.0.0/0"],
            },
          ],
          ingress: [
            {
              fromPort: 0,
              toPort: 0,
              protocol: "-1",
              // Restricts inbound traffic to only within the VPC
              cidrBlocks: [vpc.cidrBlock],
            },
          ],
        },
        opts,
      ),
    );
  }
}
