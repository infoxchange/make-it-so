import { Api } from "sst/constructs";
type ConstructScope = ConstructorParameters<typeof Api>[0];
type ConstructId = ConstructorParameters<typeof Api>[1];
type ConstructProps = Exclude<ConstructorParameters<typeof Api>[2], undefined>;
export declare class IxApi extends Api {
    constructor(scope: ConstructScope, id: ConstructId, props?: ConstructProps);
    private static setupCustomDomain;
    private static setupCertificate;
    private createDnsRecords;
}
export {};
//# sourceMappingURL=IxApi.d.ts.map