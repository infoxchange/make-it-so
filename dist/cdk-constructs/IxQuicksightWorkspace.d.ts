import { Construct } from "constructs";
type ConstructScope = ConstructorParameters<typeof Construct>[0];
type ConstructId = ConstructorParameters<typeof Construct>[1];
type Props = {
    appName: string;
    dataBuckets: string[];
};
export declare class IxQuicksightWorkspace extends Construct {
    workspaceBucketName: string;
    athenaWorkgroupName: string;
    serviceRoleArn: string;
    glueDatabaseName: string;
    quickSightDataSourceId: string;
    constructor(scope: ConstructScope, id: ConstructId, props: Props);
}
export {};
//# sourceMappingURL=IxQuicksightWorkspace.d.ts.map