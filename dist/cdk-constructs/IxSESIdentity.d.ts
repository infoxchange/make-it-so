import { Construct } from "constructs";
type ConstructScope = ConstructorParameters<typeof Construct>[0];
type ConstructId = ConstructorParameters<typeof Construct>[1];
type Props = {
    domain: string;
    mailFromSubdomain?: string;
};
export declare class IxSESIdentity extends Construct {
    constructor(scope: ConstructScope, id: ConstructId, props: Props);
}
export {};
//# sourceMappingURL=IxSESIdentity.d.ts.map