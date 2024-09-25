import { NextjsSite } from "sst/constructs";
import { IxCertificate } from "./IxCertificate.js";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { IxVpcDetails } from "./IxVpcDetails.js";
import { IxDnsRecord } from "./IxDnsRecord.js";
import ixDeployConfig from "../deployConfig.js";
import { convertToBase62Hash } from "../shared.js";

type ConstructScope = ConstructorParameters<typeof NextjsSite>[0];
type ConstructId = ConstructorParameters<typeof NextjsSite>[1];
type ConstructProps = Exclude<
  ConstructorParameters<typeof NextjsSite>[2],
  undefined
>;

export class IxNextjsSite extends NextjsSite {
  constructor(
    scope: ConstructScope,
    id: ConstructId,
    props: ConstructProps = {},
  ) {
    const isIxDeploy = !!process.env.IX_APP_NAME;

    if (isIxDeploy) {
      IxNextjsSite.addVpcDetailsToProps(scope, id, props);
      IxNextjsSite.setupCustomDomain(scope, id, props);
    }

    super(scope, id, props);

    if (isIxDeploy) {
      this.createDnsRecords(scope);
    }
  }

  // This must be static because we need to call it in the constructor before super
  private static addVpcDetailsToProps(
    scope: ConstructScope,
    id: ConstructId,
    props: ConstructProps,
  ): void {
    const vpcDetails = new IxVpcDetails(scope, id + "-IxVpcDetails");
    if (!props.cdk?.server || !("vpc" in props.cdk.server)) {
      props.cdk = props.cdk ?? {};
      props.cdk.server = {
        ...props.cdk.server,
        vpc: vpcDetails.vpc,
      };
    }
    if (!props.cdk?.revalidation || !("vpc" in props.cdk.revalidation)) {
      props.cdk = props.cdk ?? {};
      props.cdk.revalidation = {
        ...props.cdk.revalidation,
        vpc: vpcDetails.vpc,
      };
    }
  }

  // This must be static because we need to call it in the constructor before super
  private static setupCustomDomain(
    scope: ConstructScope,
    id: ConstructId,
    props: ConstructProps,
  ): void {
    // Default to using domains names passed in by the pipeline as the custom domain
    if (ixDeployConfig.isIxDeploy && !("customDomain" in props)) {
      props.customDomain = {
        domainName: ixDeployConfig.siteDomains[0],
        alternateNames: ixDeployConfig.siteDomains.slice(1),
      };
    }

    this.setupCertificate(scope, id, props);
  }

  // This must be static because we need to call it in the constructor before super
  private static setupCertificate(
    scope: ConstructScope,
    id: ConstructId,
    props: ConstructProps,
  ): void {
    if (!props?.customDomain) return;

    if (typeof props.customDomain === "string") {
      props.customDomain = { domainName: props.customDomain };
    }
    const domainName = props.customDomain.domainName;
    let subjectAlternativeNames = props.customDomain.alternateNames;

    // If domainAlias is provided, ensure it's in the subjectAlternativeNames
    if (props.customDomain.domainAlias) {
      subjectAlternativeNames = subjectAlternativeNames ?? [];

      if (!subjectAlternativeNames.includes(props.customDomain.domainAlias)) {
        subjectAlternativeNames.push(props.customDomain.domainAlias);
      }
    }

    const domainCert = new IxCertificate(scope, id + "-IxCertificate", {
      domainName,
      subjectAlternativeNames,
      region: "us-east-1", // CloudFront will only use certificates in us-east-1
    });
    props.customDomain.isExternalDomain = true;
    props.customDomain.cdk = props.customDomain.cdk ?? {};
    props.customDomain.cdk.certificate = domainCert.acmCertificate;
  }

  private createDnsRecords(scope: ConstructScope) {
    if (!this.cdk?.distribution) return;

    for (const domainName of this.customDomains) {
      const domainNameLogicalId = convertToBase62Hash(domainName);

      new IxDnsRecord(scope, `DnsRecord-${domainNameLogicalId}`, {
        type: "ALIAS",
        name: domainName,
        value: this.cdk.distribution.distributionDomainName,
        aliasZoneId: CloudFrontTarget.getHostedZoneId(scope),
        ttl: 900,
      });
    }
  }

  public get customDomains(): string[] {
    const domainNames = new Set<string>();

    if (this.primaryCustomDomain) domainNames.add(this.primaryCustomDomain);
    if (this.aliasDomain) domainNames.add(this.aliasDomain);
    if (this.alternativeDomains.length)
      this.alternativeDomains.forEach((domain) => domainNames.add(domain));

    return Array.from(domainNames);
  }

  public get primaryCustomDomain(): string | null {
    if (typeof this.props.customDomain === "string") {
      return this.props.customDomain;
    } else if (typeof this.props.customDomain === "object") {
      return this.props.customDomain.domainName ?? null;
    }
    return null;
  }

  public get aliasDomain(): string | null {
    if (typeof this.props.customDomain === "object") {
      return this.props.customDomain.domainAlias ?? null;
    }
    return null;
  }

  public get alternativeDomains(): string[] {
    if (typeof this.props.customDomain === "object") {
      return this.props.customDomain.alternateNames ?? [];
    }
    return [];
  }

  public primaryDomain =
    this.primaryCustomDomain ?? this.cdk?.distribution.distributionDomainName;

  public primaryOrigin = `https://${this.primaryDomain}`;
}
