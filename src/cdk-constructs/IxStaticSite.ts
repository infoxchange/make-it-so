import { StaticSite } from "sst/constructs";
import ixDeployConfig from "../deployConfig.js";
import {
  getAliasDomain,
  getAlternativeDomains,
  getCustomDomains,
  getPrimaryCustomDomain,
  getPrimaryDomain,
  getPrimaryOrigin,
  setupCertificate,
  setupCustomDomain,
  setupDnsRecords,
} from "../lib/site/support.js";

type ConstructScope = ConstructorParameters<typeof StaticSite>[0];
type ConstructId = ConstructorParameters<typeof StaticSite>[1];
type ConstructProps = Exclude<
  ConstructorParameters<typeof StaticSite>[2],
  undefined
>;

export class IxStaticSite extends StaticSite {
  // StaticSite's props are private, so we need to store them separately
  private propsExtended: ConstructProps;

  constructor(
    scope: ConstructScope,
    id: ConstructId,
    props: ConstructProps = {},
  ) {
    if (ixDeployConfig.isIxDeploy) {
      props = setupCustomDomain(scope, id, props);
      props = setupCertificate(scope, id, props);
    }

    super(scope, id, props);
    this.propsExtended = props;

    if (ixDeployConfig.isIxDeploy) {
      setupDnsRecords(this, scope, id, props);
    }
  }

  public get customDomains(): string[] {
    return getCustomDomains(this.propsExtended);
  }

  public get primaryCustomDomain(): string | null {
    return getPrimaryCustomDomain(this.propsExtended);
  }

  public get aliasDomain(): string | null {
    return getAliasDomain(this.propsExtended);
  }

  public get alternativeDomains(): string[] {
    return getAlternativeDomains(this.propsExtended);
  }

  public get primaryDomain(): string | null {
    return getPrimaryDomain(this, this.propsExtended);
  }

  public get primaryOrigin(): string | null {
    return getPrimaryOrigin(this.propsExtended);
  }
}
