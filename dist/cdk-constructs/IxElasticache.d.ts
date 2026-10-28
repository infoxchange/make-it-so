import { Construct } from "constructs";
import { CfnCacheCluster } from "aws-cdk-lib/aws-elasticache";
import { IVpc } from "aws-cdk-lib/aws-ec2";
type ConstructScope = ConstructorParameters<typeof Construct>[0];
type ConstructId = ConstructorParameters<typeof Construct>[1];
type CacheClusterProps = ConstructorParameters<typeof CfnCacheCluster>[2];
type Props = CacheClusterProps & {
    vpc?: IVpc;
    vpcSubnetIds?: string[];
};
export declare class IxElasticache extends Construct {
    cluster: CfnCacheCluster;
    connectionString: string;
    constructor(scope: ConstructScope, id: ConstructId, { vpc, vpcSubnetIds, ...elasticacheProps }: Props);
}
export {};
//# sourceMappingURL=IxElasticache.d.ts.map