import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Transform } from "sst3/platform/src/components/component";
export interface InternalNetworkArgs {
    name?: string;
    transform?: {
        securityGroup?: Transform<aws.ec2.SecurityGroupArgs>;
    };
}
export declare class InternalNetwork extends pulumi.ComponentResource {
    readonly vpc: pulumi.Output<aws.ec2.GetVpcResult>;
    readonly subnetIds: pulumi.Output<string[]>;
    readonly securityGroup: pulumi.Output<aws.ec2.SecurityGroup>;
    constructor(name: string, args?: InternalNetworkArgs, opts?: pulumi.ComponentResourceOptions);
    get securityGroupIds(): pulumi.Output<pulumi.Output<string>[]>;
    static getVpcSubnetIds(): pulumi.Output<string[]>;
    createSecurityGroup({ parentName, vpc, args, opts, }: {
        parentName: string;
        vpc: aws.ec2.GetVpcResult;
        args?: Transform<aws.ec2.SecurityGroupArgs>;
        opts: pulumi.ComponentResourceOptions;
    }): import("@pulumi/aws/ec2/securityGroup").SecurityGroup;
}
//# sourceMappingURL=InternalNetwork.d.ts.map