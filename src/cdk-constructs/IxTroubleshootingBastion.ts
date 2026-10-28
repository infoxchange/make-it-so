import { CfnOutput, Tags } from "aws-cdk-lib";
import {
  AmazonLinuxCpuType,
  BastionHostLinux,
  InstanceArchitecture,
  InstanceClass,
  InstanceSize,
  InstanceType,
  ISecurityGroup,
  KeyPair,
  KeyPairType,
  MachineImage,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
} from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { IxVpcDetails } from "./IxVpcDetails.js";
import deployConfig from "../deployConfig.js";
import { deindent } from "../lib/utils/strings.js";

type ConstructScope = ConstructorParameters<typeof Construct>[0];
type ConstructId = ConstructorParameters<typeof Construct>[1];
type BastionHostProps = ConstructorParameters<typeof BastionHostLinux>[2];

type Props = Omit<BastionHostProps, "vpc"> & {
  /**
   * CIDRs allowed to reach the bastion on port 22. Defaults to anywhere, which is only reasonable because the bastion
   * has no public IP — the subnet is private, so reaching it still means coming in over the VPN.
   */
  allowSshFrom?: string[];
  /** Extra packages to `dnf install` at boot, eg a database client to poke at RDS with. */
  packages?: string[];
};

/**
 * A short-lived EC2 host for poking at things that are only reachable from inside the VPC (an RDS instance, a redis
 * cluster, an internal API).
 *
 * Unlike a plain BastionHostLinux this is set up for SSH rather than SSM Session Manager. EC2 generates the key pair
 * and CloudFormation stores the private key in Parameter Store, so no key material passes through the template or an
 * env var. On a CI deploy the instructions for connecting are emitted as a workflow annotation. Otherwise the host
 * tags itself so you can find it, and its key, without knowing the stack or instance name:
 *
 *     aws ec2 describe-instances \
 *       --filters Name=tag:CreatorResource,Values=IxTroubleshootingBastion \
 *                 Name=instance-state-name,Values=running \
 *       --query "Reservations[].Instances[].[PrivateIpAddress,KeyName]" --output text
 *     aws ec2 describe-key-pairs --key-names <key name> --query "KeyPairs[].KeyPairId" --output text
 *     aws ssm get-parameter --name /ec2/keypair/<key pair id> --with-decryption \
 *       --query Parameter.Value --output text > /tmp/troubleshooting-bastion.pem
 *     chmod 400 /tmp/troubleshooting-bastion.pem
 *     ssh -i /tmp/troubleshooting-bastion.pem ec2-user@<private ip>
 *
 * CloudFormation deletes that parameter along with the key pair, so nothing is left behind — but it needs
 * `ssm:PutParameter` and `ssm:DeleteParameter` on the deploying role to create and remove the stack. The delete check
 * runs against a fabricated parameter name, so a missing permission shows up as an AccessDeniedException naming a
 * parameter that doesn't exist.
 *
 * This is a debugging tool, not something to leave running: it is a host in the private subnets accepting SSH from
 * anywhere by default, so remove it once you are done.
 */
export class IxTroubleshootingBastion extends Construct {
  public bastion: BastionHostLinux;

  public keyPair: KeyPair;

  public securityGroup: ISecurityGroup;

  constructor(
    scope: ConstructScope,
    id: ConstructId,
    {
      allowSshFrom = ["0.0.0.0/0"],
      securityGroup,
      packages = [],
      ...bastionProps
    }: Props = {},
  ) {
    super(scope, id);

    const { vpc } = new IxVpcDetails(this, `${id}-IxVpcDetails`);

    this.securityGroup =
      securityGroup ??
      new SecurityGroup(this, `${id}-SecurityGroup`, {
        vpc,
        allowAllOutbound: true,
        description: `Security group for ${deployConfig.appName} ${deployConfig.environment} troubleshooting bastion`,
      });

    for (const cidr of allowSshFrom) {
      this.securityGroup.addIngressRule(
        Peer.ipv4(cidr),
        Port.tcp(22),
        `Allow SSH to the troubleshooting bastion from ${cidr}`,
      );
    }

    // Omitting publicKeyMaterial is what makes this a generated key pair, which is what gets the private key written
    // to Parameter Store.
    this.keyPair = new KeyPair(this, `${id}-KeyPair`, {
      type: KeyPairType.ED25519,
    });

    // The smallest instance type available, and the cheapest of the 512MiB ones.
    const instanceType =
      bastionProps.instanceType ??
      InstanceType.of(InstanceClass.T4G, InstanceSize.NANO);

    this.bastion = new BastionHostLinux(this, `${id}-Bastion`, {
      instanceName: `${deployConfig.appName}-${deployConfig.environment}-${id}`,
      // IxVpcDetails registers its subnets as isolated, so the BastionHostLinux default of PRIVATE_WITH_EGRESS finds
      // no subnets to place the instance in.
      subnetSelection: { subnetType: SubnetType.PRIVATE_ISOLATED },
      instanceType,
      // Pinned rather than left to the `bastionHostUseAmazonLinux2023ByDefault` feature flag so the OS the packages
      // below are installed with is predictable.
      machineImage: MachineImage.latestAmazonLinux2023({
        cpuType:
          instanceType.architecture === InstanceArchitecture.ARM_64
            ? AmazonLinuxCpuType.ARM_64
            : AmazonLinuxCpuType.X86_64,
      }),
      ...bastionProps,
      vpc,
      securityGroup: this.securityGroup,
    });

    // BastionHostLinux takes no keyPair/keyName prop of its own (aws-cdk#18565), so this goes on the L1 directly.
    // cloud-init picks the key up from instance metadata and writes it to the default user's authorized_keys, which
    // is why there's no key handling in the user data below.
    this.bastion.instance.instance.keyName = this.keyPair.keyPairName;

    // Lets the host be found with `describe-instances --filters Name=tag:CreatorResource,...` without having to know
    // the stack or instance name. See the connection instructions above.
    Tags.of(this.bastion).add("CreatorResource", "IxTroubleshootingBastion");

    this.installPackages(packages);

    const tmpCertPath = "/tmp/troubleshooting-bastion.pem";
    const message = deindent(`
      A troubleshooting bastion host has been deployed. MAKE SURE TO REMOVE IT AFTER USE.

      To fetch the private key used to connect to the bastion host run:
        ix aws auth -A app:${deployConfig.appName}/${deployConfig.environment} -- aws ssm get-parameter --name /ec2/keypair/${this.keyPair.keyPairId} --with-decryption --query Parameter.Value --output text > ${tmpCertPath}
        chmod 400 ${tmpCertPath}

      To connect to the bastion host ensure you're connected to the VPN then run:
        ssh -i ${tmpCertPath} ec2-user@${this.bastion.instancePrivateIp}
    `);

    let outputValue;
    if (process.env.CI) {
      outputValue = `The following note is available as an annotation in the CI workflow run:\n::warning title=Troubleshooting Bastion::${message.replaceAll("\n", "%0A")}`;
    } else {
      outputValue = message;
    }

    // We can't just log this with console.log() since the CDK tokens aren't resolvable at that point.
    new CfnOutput(this, "TroubleshootingBastionNote", {
      value: outputValue,
    });
  }

  private installPackages(packages: string[]) {
    if (!packages.length) {
      return;
    }

    const { userData } = this.bastion.instance;

    // The subnet has no direct egress, so reaching the package repos goes via the proxy.
    if (deployConfig.vpcHttpProxy) {
      userData.addCommands(
        `export http_proxy=${deployConfig.vpcHttpProxy}`,
        `export https_proxy=${deployConfig.vpcHttpProxy}`,
        `export no_proxy=169.254.169.254,localhost,127.0.0.1`,
      );
    }

    userData.addCommands(`dnf install -y ${packages.join(" ")}`);
  }
}
