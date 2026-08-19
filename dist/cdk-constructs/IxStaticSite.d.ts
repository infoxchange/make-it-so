import { StaticSite } from "sst/constructs";
import { ExtendedStaticSiteProps } from "../lib/site/support.js";
type ConstructScope = ConstructorParameters<typeof StaticSite>[0];
type ConstructId = ConstructorParameters<typeof StaticSite>[1];
type ConstructProps = ExtendedStaticSiteProps;
export declare class IxStaticSite extends StaticSite {
    private propsExtended;
    constructor(scope: ConstructScope, id: ConstructId, props?: ConstructProps);
    get customDomains(): string[];
    get primaryCustomDomain(): string | null;
    get aliasDomain(): string | null;
    get alternativeDomains(): string[];
    get primaryDomain(): string | null;
    get primaryOrigin(): string | null;
}
export {};
//# sourceMappingURL=IxStaticSite.d.ts.map