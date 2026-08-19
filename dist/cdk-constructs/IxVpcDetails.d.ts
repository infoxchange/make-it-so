import { Construct } from "constructs";
import { IVpc } from "aws-cdk-lib/aws-ec2";
type ConstructScope = ConstructorParameters<typeof Construct>[0];
type ConstructId = ConstructorParameters<typeof Construct>[1];
export declare class IxVpcDetails extends Construct {
    vpc: IVpc;
    constructor(scope: ConstructScope, id: ConstructId);
    private getVpc;
    static getVpcSubnetIds(scope: ConstructScope): Array<string>;
}
export {};
//# sourceMappingURL=IxVpcDetails.d.ts.map