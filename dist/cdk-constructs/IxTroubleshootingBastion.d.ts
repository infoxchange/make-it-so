import { BastionHostLinux, ISecurityGroup, KeyPair } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
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
export declare class IxTroubleshootingBastion extends Construct {
    bastion: BastionHostLinux;
    keyPair: KeyPair;
    securityGroup: ISecurityGroup;
    constructor(scope: ConstructScope, id: ConstructId, { allowSshFrom, securityGroup, packages, ...bastionProps }?: Props);
    private installPackages;
}
export {};
//# sourceMappingURL=IxTroubleshootingBastion.d.ts.map