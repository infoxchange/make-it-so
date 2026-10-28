import { StaticSite } from "sst/constructs";
import ixDeployConfig from "../deployConfig.js";
import { getAliasDomain, getAlternativeDomains, getCustomDomains, getPrimaryCustomDomain, getPrimaryDomain, getPrimaryOrigin, processAuthProps, setupCertificate, setupCustomDomain, setupDnsRecords, setupDomainAliasRedirect, } from "../lib/site/support.js";
export class IxStaticSite extends StaticSite {
    // StaticSite's props are private, so we need to store them separately
    propsExtended;
    constructor(scope, id, props = {}) {
        if (ixDeployConfig.isIxDeploy) {
            props = setupCustomDomain(scope, id, props);
            props = setupCertificate(scope, id, props);
            props = setupDomainAliasRedirect(scope, id, props);
        }
        props = processAuthProps(scope, id, "StaticSite", props);
        super(scope, id, props);
        this.propsExtended = props;
        if (ixDeployConfig.isIxDeploy) {
            setupDnsRecords(this, scope, id, props);
        }
    }
    get customDomains() {
        return getCustomDomains(this.propsExtended);
    }
    get primaryCustomDomain() {
        return getPrimaryCustomDomain(this.propsExtended);
    }
    get aliasDomain() {
        return getAliasDomain(this.propsExtended);
    }
    get alternativeDomains() {
        return getAlternativeDomains(this.propsExtended);
    }
    get primaryDomain() {
        return getPrimaryDomain(this, this.propsExtended);
    }
    get primaryOrigin() {
        return getPrimaryOrigin(this, this.propsExtended);
    }
}
