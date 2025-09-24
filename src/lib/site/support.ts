import { Construct } from "constructs";
import {
  NextjsSite,
  NextjsSiteProps,
  Stack,
  StaticSite,
  StaticSiteProps,
} from "sst/constructs";
import ixDeployConfig from "../../deployConfig.js";
import { IxCertificate } from "../../cdk-constructs/IxCertificate.js";
import { IxWebsiteRedirect } from "../../cdk-constructs/IxWebsiteRedirect.js";
import { IxVpcDetails } from "../../cdk-constructs/IxVpcDetails.js";
import { IxDnsRecord } from "../../cdk-constructs/IxDnsRecord.js";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { convertToBase62Hash } from "../utils/hash.js";
import { type DistributionDomainProps } from "sst/constructs/Distribution.js";
import type { Plan as SSTPlan } from "sst/constructs/SsrSite.js";

export type ExtendedCustomDomains = DistributionDomainProps & {
  isIxManagedDomain?: boolean;
  additionalDomainAliases?: string[];
};
export type ExtendedNextjsSiteProps = Omit<NextjsSiteProps, "customDomain"> & {
  customDomain?: string | ExtendedCustomDomains;
};
export type ExtendedStaticSiteProps = Omit<StaticSiteProps, "customDomain"> & {
  customDomain?: string | ExtendedCustomDomains;
};

export function setupCustomDomain<
  Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps,
>(scope: Construct, id: string, props: Readonly<Props>): Props {
  let updatedProps = props;
  // Default to using domains names passed in by the pipeline as the custom domain
  if (ixDeployConfig.isIxDeploy && !("customDomain" in updatedProps)) {
    updatedProps = {
      ...updatedProps,
      customDomain: {
        isIxManagedDomain: true,
        isExternalDomain: true,
        domainName: ixDeployConfig.siteDomains[0],
        alternateNames: ixDeployConfig.siteDomains.slice(1),
        domainAlias: ixDeployConfig.siteDomainAliases[0],
        additionalDomainAliases: ixDeployConfig.siteDomainAliases.slice(1),
      },
    };
  }
  return updatedProps;
}

export function setupCertificate<
  Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps,
>(scope: Construct, id: string, props: Readonly<Props>): Props {
  const updatedProps: Props = { ...props };
  if (!updatedProps?.customDomain) return updatedProps;

  if (typeof updatedProps.customDomain === "string") {
    updatedProps.customDomain = { domainName: updatedProps.customDomain };
  }

  // No cert creation required if isIxManagedDomain is false or a cert is already provided
  if (
    !updatedProps.customDomain.isIxManagedDomain &&
    updatedProps.customDomain.cdk?.certificate
  ) {
    return updatedProps;
  }

  const domainCert = new IxCertificate(scope, id + "-IxCertificate", {
    domainName: updatedProps.customDomain.domainName,
    subjectAlternativeNames: updatedProps.customDomain.alternateNames,
    region: "us-east-1", // CloudFront will only use certificates in us-east-1
  });
  updatedProps.customDomain.cdk = updatedProps.customDomain.cdk ?? {};
  updatedProps.customDomain.cdk.certificate = domainCert.acmCertificate;

  return updatedProps;
}

export function setupDomainAliasRedirect<
  Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps,
>(scope: Construct, id: string, props: Readonly<Props>): Props {
  if (
    typeof props.customDomain !== "object" ||
    !(
      props.customDomain.domainAlias ||
      props.customDomain.additionalDomainAliases?.length
    ) ||
    !props.customDomain.isIxManagedDomain ||
    !props.customDomain.cdk?.certificate
  ) {
    return props;
  }
  const domainsToRedirectFrom = [
    ...(props.customDomain.domainAlias ? [props.customDomain.domainAlias] : []),
    ...(props.customDomain.additionalDomainAliases ?? []),
  ];
  new IxWebsiteRedirect(scope, id + "-IxWebsiteRedirect", {
    recordNames: domainsToRedirectFrom,
    targetDomain: props.customDomain.domainName,
  });
  return {
    ...props,
    customDomain: {
      ...props.customDomain,
      domainAlias: undefined, // SST's site constructs will complain if domainAlias is set while isExternalDomain is true
    },
  };
}

export function setupVpcDetails<Props extends ExtendedNextjsSiteProps>(
  scope: Construct,
  id: string,
  props: Readonly<Props>,
): Props {
  let updatedProps: Props = { ...props };
  const vpcDetails = new IxVpcDetails(scope, id + "-IxVpcDetails");
  if (!updatedProps.cdk?.server || !("vpc" in updatedProps.cdk.server)) {
    updatedProps.cdk = updatedProps.cdk ?? {};
    updatedProps.cdk.server = {
      ...updatedProps.cdk.server,
      vpc: vpcDetails.vpc,
    };
    updatedProps = addHttpProxyEnvVars(scope, id, updatedProps) as Props;
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

/**
 * Adds HTTP proxy environment variables to the provided site props.
 *
 * We can't simply add them to `props.environment` because those are used during the build step which may happen outside
 * the vpc. Instead we have to add them to all the places `props.environment` is used, accept for the build step.
 */
export function addHttpProxyEnvVars<Props extends ExtendedNextjsSiteProps>(
  scope: Construct,
  id: string,
  props: Readonly<Props>,
  proxyEnvVars?: Record<string, string>,
): Props {
  const updatedProps: Props = { ...props };

  updatedProps.cdk = updatedProps.cdk ?? {};
  const oldTransform = updatedProps.cdk.transform;
  updatedProps.cdk.transform = (plan: SSTPlan) => {
    oldTransform?.(plan);

    if (!proxyEnvVars) {
      if (!ixDeployConfig.vpcHttpProxy) {
        console.warn(
          `Attempting to add HTTP proxy environment variables to ${id} but the VPC_HTTP_PROXY env var is not configured.`,
        );
        return;
      }

      proxyEnvVars = {
        HTTP_PROXY: ixDeployConfig.vpcHttpProxy,
        HTTPS_PROXY: ixDeployConfig.vpcHttpProxy,
        http_proxy: ixDeployConfig.vpcHttpProxy,
        https_proxy: ixDeployConfig.vpcHttpProxy,
      };
    }

    for (const origin of Object.values(plan.origins)) {
      if (!("function" in origin) || !origin.function.environment) {
        continue;
      }
      Object.assign(origin.function.environment, proxyEnvVars);
    }
  };
  return updatedProps;
}

export function setupDefaultEnvVars<Props extends ExtendedNextjsSiteProps>(
  scope: Construct | Stack,
  id: string,
  props: Readonly<Props>,
): Props {
  let updatedProps: Props = { ...props };
  // NextjsSite functions to not use default env var unfortunately so we have to
  // explicitly set them ourselves https://github.com/sst/sst/issues/2359
  if ("defaultFunctionProps" in scope) {
    for (const funcProps of scope.defaultFunctionProps) {
      const defaultFunctionEnvVars = { ...funcProps.environment };

      // Remove any HTTP proxy related env vars and set them in a separate call to addHttpProxyEnvVars
      // to avoid them being used during the build step.
      const defaultFunctionHttpProxyEnvVars: Record<string, string> = {};
      for (const proxyEnvVar of [
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "http_proxy",
        "https_proxy",
      ]) {
        if (proxyEnvVar in defaultFunctionEnvVars) {
          defaultFunctionHttpProxyEnvVars[proxyEnvVar] =
            defaultFunctionEnvVars[proxyEnvVar];
          delete defaultFunctionEnvVars[proxyEnvVar];
        }
      }
      if (Object.keys(defaultFunctionHttpProxyEnvVars).length) {
        updatedProps = addHttpProxyEnvVars(
          scope,
          id,
          updatedProps,
          defaultFunctionHttpProxyEnvVars,
        ) as Props;
      }

      updatedProps.environment = {
        ...defaultFunctionEnvVars,
        ...updatedProps.environment,
      };
    }
  }
  return updatedProps;
}

export function setupDnsRecords<
  Instance extends NextjsSite | StaticSite,
  Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps,
>(
  instance: Instance,
  scope: Construct,
  id: string,
  props: Readonly<Props>,
): void {
  if (
    !instance.cdk?.distribution ||
    typeof props.customDomain !== "object" ||
    !props.customDomain.isIxManagedDomain
  )
    return;

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
  Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps,
>(props: Readonly<Props>): string[] {
  const domainNames = new Set<string>();

  const primaryCustomDomain = getPrimaryCustomDomain(props);
  const alternativeDomains = getAlternativeDomains(props);

  if (primaryCustomDomain) domainNames.add(primaryCustomDomain);
  if (alternativeDomains.length)
    alternativeDomains.forEach((domain) => domainNames.add(domain));

  return Array.from(domainNames);
}

export function getPrimaryDomain<
  Instance extends NextjsSite | StaticSite,
  Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps,
>(instance: Instance, props: Readonly<Props>): string | null {
  return (
    getPrimaryCustomDomain(props) ??
    instance.cdk?.distribution?.distributionDomainName ??
    null
  );
}

export function getPrimaryOrigin<
  Instance extends NextjsSite | StaticSite,
  Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps,
>(instance: Instance, props: Readonly<Props>): string | null {
  const primaryDomain = getPrimaryDomain(instance, props);
  return primaryDomain ? `https://${primaryDomain}` : null;
}

export function getPrimaryCustomDomain<
  Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps,
>(props: Readonly<Props>): string | null {
  if (typeof props.customDomain === "string") {
    return props.customDomain;
  } else if (typeof props.customDomain === "object") {
    return props.customDomain.domainName ?? null;
  }
  return null;
}

export function getAliasDomain<
  Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps,
>(props: Readonly<Props>): string | null {
  if (typeof props.customDomain === "object") {
    return props.customDomain.domainAlias ?? null;
  }
  return null;
}

export function getAlternativeDomains<
  Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps,
>(props: Readonly<Props>): string[] {
  if (typeof props.customDomain === "object") {
    return props.customDomain.alternateNames ?? [];
  }
  return [];
}
