import { NextjsSite } from "sst/constructs";
import ixDeployConfig from "../deployConfig.js";
import { getAliasDomain, getAlternativeDomains, getCustomDomains, getPrimaryCustomDomain, getPrimaryDomain, getPrimaryOrigin, setupCertificate, setupCustomDomain, setupDnsRecords, setupDomainAliasRedirect, setupVpcDetails, setupDefaultEnvVars, applyConditionalEnvironmentVariables, parentCompatibleSsrProps, processAuthProps, } from "../lib/site/support.js";
export class IxNextjsSite extends NextjsSite {
    constructor(scope, id, props = {}) {
        if (ixDeployConfig.isIxDeploy) {
            props = setupVpcDetails(scope, id, props);
            props = setupCustomDomain(scope, id, props);
            props = setupCertificate(scope, id, props);
            props = setupDomainAliasRedirect(scope, id, props);
        }
        props = processAuthProps(scope, id, "SsrSite", props);
        props = setupDefaultEnvVars(scope, id, props);
        props = applyConditionalEnvironmentVariables(scope, id, props);
        super(scope, id, parentCompatibleSsrProps(props));
        if (ixDeployConfig.isIxDeploy) {
            setupDnsRecords(this, scope, id, props);
        }
    }
    get customDomains() {
        return getCustomDomains(this.props);
    }
    get primaryCustomDomain() {
        return getPrimaryCustomDomain(this.props);
    }
    get aliasDomain() {
        return getAliasDomain(this.props);
    }
    get alternativeDomains() {
        return getAlternativeDomains(this.props);
    }
    get primaryDomain() {
        return getPrimaryDomain(this, this.props);
    }
    get primaryOrigin() {
        return getPrimaryOrigin(this, this.props);
    }
}
