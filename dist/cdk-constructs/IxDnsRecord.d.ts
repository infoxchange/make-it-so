import { Construct } from "constructs";
type ConstructScope = ConstructorParameters<typeof Construct>[0];
type ConstructId = ConstructorParameters<typeof Construct>[1];
type Props = {
    name: string;
    value: string;
    ttl?: number;
    hostedZoneId?: string;
} & ({
    type: "A" | "CNAME" | "NS" | "SOA" | "TXT";
} | {
    type: "ALIAS";
    aliasZoneId: string;
} | {
    type: "MX";
    priority: number;
});
export declare class IxDnsRecord extends Construct {
    constructor(scope: ConstructScope, id: ConstructId, props: Props);
    private createDnsRecord;
}
export {};
//# sourceMappingURL=IxDnsRecord.d.ts.map