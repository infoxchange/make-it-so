import { NextjsSite } from "sst/constructs";
import { type ExtendedNextjsSiteProps } from "../lib/site/support.js";
type ConstructScope = ConstructorParameters<typeof NextjsSite>[0];
type ConstructId = ConstructorParameters<typeof NextjsSite>[1];
type ConstructProps = ExtendedNextjsSiteProps;
export declare class IxNextjsSite extends NextjsSite {
    constructor(scope: ConstructScope, id: ConstructId, props?: ConstructProps);
    get customDomains(): string[];
    get primaryCustomDomain(): string | null;
    get aliasDomain(): string | null;
    get alternativeDomains(): string[];
    get primaryDomain(): string | null;
    get primaryOrigin(): string | null;
}
export {};
//# sourceMappingURL=IxNextjsSite.d.ts.map