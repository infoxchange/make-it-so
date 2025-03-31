import { Construct } from "constructs";
import {
  NextjsSite,
  NextjsSiteProps,
  StaticSite,
  StaticSiteProps,
} from "sst/constructs";
import ixDeployConfig from "../../deployConfig.js";
import { IxCertificate } from "../../cdk-constructs/IxCertificate.js";
import { IxVpcDetails } from "../../cdk-constructs/IxVpcDetails.js";
import { IxDnsRecord } from "../../cdk-constructs/IxDnsRecord.js";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { convertToBase62Hash } from "../utils/hash.js";

export function setupCustomDomain<
  Props extends StaticSiteProps | NextjsSiteProps,
>(scope: Construct, id: string, props: Readonly<Props>): Props {
  let updatedProps = props;
  // Default to using domains names passed in by the pipeline as the custom domain
  if (ixDeployConfig.isIxDeploy && !("customDomain" in updatedProps)) {
    updatedProps = {
      ...updatedProps,
      customDomain: {
        domainName: ixDeployConfig.siteDomains[0],
        alternateNames: ixDeployConfig.siteDomains.slice(1),
        domainAlias: ixDeployConfig.siteDomainAliases[0],
      },
    };
  }
  return updatedProps;
}

export function setupCertificate<
  Props extends StaticSiteProps | NextjsSiteProps,
>(scope: Construct, id: string, props: Readonly<Props>): Props {
  const updatedProps: Props = { ...props };
  if (!updatedProps?.customDomain) return updatedProps;

  if (typeof updatedProps.customDomain === "string") {
    updatedProps.customDomain = { domainName: updatedProps.customDomain };
  }
  const domainName = updatedProps.customDomain.domainName;
  let subjectAlternativeNames = updatedProps.customDomain.alternateNames;

  // If domainAlias is provided, ensure it's in the subjectAlternativeNames
  if (updatedProps.customDomain.domainAlias) {
    subjectAlternativeNames = subjectAlternativeNames ?? [];

    if (
      !subjectAlternativeNames.includes(updatedProps.customDomain.domainAlias)
    ) {
      subjectAlternativeNames.push(updatedProps.customDomain.domainAlias);
    }
  }

  const domainCert = new IxCertificate(scope, id + "-IxCertificate", {
    domainName,
    subjectAlternativeNames,
    region: "us-east-1", // CloudFront will only use certificates in us-east-1
  });
  updatedProps.customDomain.isExternalDomain = true;
  updatedProps.customDomain.cdk = updatedProps.customDomain.cdk ?? {};
  updatedProps.customDomain.cdk.certificate = domainCert.acmCertificate;

  return updatedProps;
}

export function setupVpcDetails<Props extends NextjsSiteProps>(
  scope: Construct,
  id: string,
  props: Readonly<Props>,
): Props {
  const updatedProps: Props = { ...props };
  const vpcDetails = new IxVpcDetails(scope, id + "-IxVpcDetails");
  if (!updatedProps.cdk?.server || !("vpc" in updatedProps.cdk.server)) {
    updatedProps.cdk = updatedProps.cdk ?? {};
    updatedProps.cdk.server = {
      ...updatedProps.cdk.server,
      vpc: vpcDetails.vpc,
    };
  }
  if (
    !updatedProps.cdk?.revalidation ||
    !("vpc" in updatedProps.cdk.revalidation)
  ) {
    updatedProps.cdk = props.cdk ?? {};
    updatedProps.cdk.revalidation = {
      ...updatedProps.cdk.revalidation,
      vpc: vpcDetails.vpc,
    };
  }
  return updatedProps;
}

export function setupDnsRecords<
  Instance extends NextjsSite | StaticSite,
  Props extends StaticSiteProps | NextjsSiteProps,
>(
  instance: Instance,
  scope: Construct,
  id: string,
  props: Readonly<Props>,
): void {
  if (!instance.cdk?.distribution) return;

  for (const domainName of getCustomDomains(props)) {
    const domainNameLogicalId = convertToBase62Hash(domainName);

    new IxDnsRecord(scope, `DnsRecord-${domainNameLogicalId}`, {
      type: "ALIAS",
      name: domainName,
      value: instance.cdk.distribution.distributionDomainName,
      aliasZoneId: CloudFrontTarget.getHostedZoneId(scope),
      ttl: 900,
    });
  }
}

export function getCustomDomains<
  Props extends StaticSiteProps | NextjsSiteProps,
>(props: Readonly<Props>): string[] {
  const domainNames = new Set<string>();

  const primaryCustomDomain = getPrimaryCustomDomain(props);
  const aliasDomain = getAliasDomain(props);
  const alternativeDomains = getAlternativeDomains(props);

  if (primaryCustomDomain) domainNames.add(primaryCustomDomain);
  if (aliasDomain) domainNames.add(aliasDomain);
  if (alternativeDomains.length)
    alternativeDomains.forEach((domain) => domainNames.add(domain));

  return Array.from(domainNames);
}

export function getPrimaryDomain<
  Instance extends NextjsSite | StaticSite,
  Props extends StaticSiteProps | NextjsSiteProps,
>(instance: Instance, props: Readonly<Props>): string | null {
  return (
    getPrimaryCustomDomain(props) ??
    instance.cdk?.distribution?.distributionDomainName ??
    null
  );
}

export function getPrimaryOrigin<
  Props extends StaticSiteProps | NextjsSiteProps,
>(props: Readonly<Props>): string | null {
  const primaryDomain = getPrimaryCustomDomain(props);
  return primaryDomain ? `https://${primaryDomain}` : null;
}

export function getPrimaryCustomDomain<
  Props extends StaticSiteProps | NextjsSiteProps,
>(props: Readonly<Props>): string | null {
  if (typeof props.customDomain === "string") {
    return props.customDomain;
  } else if (typeof props.customDomain === "object") {
    return props.customDomain.domainName ?? null;
  }
  return null;
}

export function getAliasDomain<Props extends StaticSiteProps | NextjsSiteProps>(
  props: Readonly<Props>,
): string | null {
  if (typeof props.customDomain === "object") {
    return props.customDomain.domainAlias ?? null;
  }
  return null;
}

export function getAlternativeDomains<
  Props extends StaticSiteProps | NextjsSiteProps,
>(props: Readonly<Props>): string[] {
  if (typeof props.customDomain === "object") {
    return props.customDomain.alternateNames ?? [];
  }
  return [];
}
