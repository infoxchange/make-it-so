import { Bucket } from "sst/constructs";
type ConstructScope = ConstructorParameters<typeof Bucket>[0];
type ConstructId = ConstructorParameters<typeof Bucket>[1];
type ConstructProps = Exclude<ConstructorParameters<typeof Bucket>[2], undefined>;
export declare class IxBucket extends Bucket {
    constructor(scope: ConstructScope, id: ConstructId, props?: ConstructProps);
}
export {};
//# sourceMappingURL=IxBucket.d.ts.map