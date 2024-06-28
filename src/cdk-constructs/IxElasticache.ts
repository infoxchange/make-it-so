import { Construct } from "constructs";
import { CfnCacheCluster, CfnSubnetGroup } from "aws-cdk-lib/aws-elasticache";
import { IVpc, SecurityGroup, Peer, Port } from "aws-cdk-lib/aws-ec2";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Stack } from "aws-cdk-lib";
import { IxVpcDetails } from "./IxVpcDetails.js";
import deployConfig from "../deployConfig.js";

type ConstructScope = ConstructorParameters<typeof Construct>[0];
type ConstructId = ConstructorParameters<typeof Construct>[1];
type CacheClusterProps = ConstructorParameters<typeof CfnCacheCluster>[2];

type Props = CacheClusterProps & {
  vpc?: IVpc;
  vpcSubnetIds?: string[];
};

export class IxElasticache extends Construct {
  cluster: CfnCacheCluster;

  connectionString: string;

  constructor(
    scope: ConstructScope,
    id: ConstructId,
    { vpc, vpcSubnetIds, ...elasticacheProps }: Props,
  ) {
    super(scope, id);

    // Setup cluster name
    if (!elasticacheProps.clusterName && deployConfig.isIxDeploy) {
      elasticacheProps.clusterName = `${Stack.of(this).stackName}`;
    }

    if (!elasticacheProps.cacheSubnetGroupName) {
      // Setup VPC
      if (!vpc && deployConfig.isIxDeploy) {
        const vpcDetails = new IxVpcDetails(scope, id + "-IxVpcDetails");
        vpc = vpcDetails.vpc;
      }

      // Setup VPC subnets
      if (vpc && !vpcSubnetIds) {
        if (deployConfig.isIxDeploy) {
          vpcSubnetIds = [1, 2, 3].map((subnetNum) =>
            StringParameter.valueForStringParameter(
              scope,
              `/vpc/subnet/private-${deployConfig.workloadGroup}/${subnetNum}/id`,
            ),
          );
        } else {
          vpcSubnetIds = vpc.privateSubnets.map((subnet) => subnet.subnetId);

          if (!vpcSubnetIds.length) {
            throw Error(`The vpc ${vpc.vpcId} has no private subnets.`);
          }
        }
      }
    }

    // Setup cluster security group
    if (vpc && vpcSubnetIds) {
      const subnetGroup = new CfnSubnetGroup(scope, "ElasticacheSubnetGroup", {
        subnetIds: vpcSubnetIds,
        description: "Subnet group for redis",
      });

      elasticacheProps.cacheSubnetGroupName = subnetGroup.ref;

      const namePrefix = elasticacheProps.clusterName
        ? elasticacheProps.clusterName
        : `${Stack.of(this).stackName}`;

      const securityGroup = new SecurityGroup(
        scope,
        "ElasticacheSecurityGroup",
        {
          vpc,
          allowAllOutbound: true,
          description: "Security group for Elasticache Cluster",
          securityGroupName: `${namePrefix}-elasticache`,
        },
      );

      for (const subnetIndex of [1, 2, 3]) {
        const cidr = StringParameter.valueForStringParameter(
          scope,
          `/vpc/subnet/private-${deployConfig.workloadGroup}/${subnetIndex}/cidr`,
        );
        securityGroup.addIngressRule(
          Peer.ipv4(cidr),
          Port.tcp(6379),
          `Allow access to Elasticache cluster from private ${deployConfig.workloadGroup} subnet`,
        );
      }

      elasticacheProps.vpcSecurityGroupIds = [securityGroup.securityGroupId];
    }

    // Create Redis Cluster
    this.cluster = new CfnCacheCluster(scope, "RedisCluster", elasticacheProps);

    if (elasticacheProps.engine === "redis") {
      this.connectionString = `redis://${this.cluster.attrRedisEndpointAddress}:${this.cluster.attrRedisEndpointPort}`;
    } else if (elasticacheProps.engine === "memcached") {
      this.connectionString = `${this.cluster.attrConfigurationEndpointAddress}:${this.cluster.attrConfigurationEndpointPort}`;
    } else {
      throw Error(`Unsupported engine: ${elasticacheProps.engine}`);
    }
  }
}
