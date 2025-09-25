import { NextjsSite } from "sst/constructs";
import ixDeployConfig from "../deployConfig.js";
import {
  type ExtendedNextjsSiteProps,
  getAliasDomain,
  getAlternativeDomains,
  getCustomDomains,
  getPrimaryCustomDomain,
  getPrimaryDomain,
  getPrimaryOrigin,
  setupCertificate,
  setupCustomDomain,
  setupDnsRecords,
  setupDomainAliasRedirect,
  setupVpcDetails,
  setupDefaultEnvVars,
} from "../lib/site/support.js";

type ConstructScope = ConstructorParameters<typeof NextjsSite>[0];
type ConstructId = ConstructorParameters<typeof NextjsSite>[1];
type ConstructProps = ExtendedNextjsSiteProps;

export class IxNextjsSite extends NextjsSite {
  constructor(
    scope: ConstructScope,
    id: ConstructId,
    props: ConstructProps = {},
  ) {
    if (ixDeployConfig.isIxDeploy) {
      props = setupVpcDetails(scope, id, props);
      props = setupCustomDomain(scope, id, props);
      props = setupCertificate(scope, id, props);
      props = setupDomainAliasRedirect(scope, id, props);
      props = setupDefaultEnvVars(scope, id, props);
    }

    super(scope, id, props);

    if (ixDeployConfig.isIxDeploy) {
      setupDnsRecords(this, scope, id, props);
    }
  }

  public get customDomains(): string[] {
    return getCustomDomains(this.props);
  }

  public get primaryCustomDomain(): string | null {
    return getPrimaryCustomDomain(this.props);
  }

  public get aliasDomain(): string | null {
    return getAliasDomain(this.props);
  }

  public get alternativeDomains(): string[] {
    return getAlternativeDomains(this.props);
  }

  public get primaryDomain(): string | null {
    return getPrimaryDomain(this, this.props);
  }

  public get primaryOrigin(): string | null {
    return getPrimaryOrigin(this, this.props);
  }
}
