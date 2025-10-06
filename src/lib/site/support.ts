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
export type ExtendedNextjsSiteProps = Omit<
  NextjsSiteProps,
  "customDomain" | "environment"
> & {
  customDomain?: string | ExtendedCustomDomains;
  /**
   * An object with the key being the environment variable name. The value can either be the environment variable value
   * as a string or as an object with `buildtime` and/or `runtime` properties where the values of `buildtime` and
   * `runtime` is the environment variable value that will be used during that step.
   *
   * @example
   * ```js
   * environment: {
   *   USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
   *   NODE_OPTIONS: {
   *     buildtime: "--max-old-space-size=4096",
   *   },
   *   API_URL: {
   *     buildtime: "https://external.domain",
   *     runtime: "https://internal.domain",
   *   },
   * },
   * ```
   */
  environment?: Record<
    string,
    string | { buildtime?: string; runtime?: string }
  >;
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
  const updatedProps: Props = { ...props };

  // Don't make any changes if the user has set the VPC manually in any place
  if (
    "vpc" in (updatedProps.cdk?.server || {}) ||
    "vpc" in (updatedProps.cdk?.revalidation || {})
  ) {
    return updatedProps;
  }

  const vpcDetails = new IxVpcDetails(scope, id + "-IxVpcDetails");

  updatedProps.cdk = updatedProps.cdk ?? {};
  updatedProps.cdk.server = {
    ...updatedProps.cdk.server,
    vpc: vpcDetails.vpc,
  };
  updatedProps.cdk.revalidation = {
    ...updatedProps.cdk.revalidation,
    vpc: vpcDetails.vpc,
  };

  if (!ixDeployConfig.vpcHttpProxy) {
    console.warn(
      `Attempting to add HTTP proxy environment variables to ${id} but the VPC_HTTP_PROXY env var is not configured.`,
    );
  }
  // If we're using the AWS runner then the build stage will already be inside the VPC and required the proxy but
  // the HTTP proxy environment variables will be already set in the environment by the pipeline and so the build
  // stage will inherit that.
  updatedProps.environment = {
    HTTP_PROXY: { runtime: ixDeployConfig.vpcHttpProxy },
    HTTPS_PROXY: { runtime: ixDeployConfig.vpcHttpProxy },
    http_proxy: { runtime: ixDeployConfig.vpcHttpProxy },
    https_proxy: { runtime: ixDeployConfig.vpcHttpProxy },
    ...updatedProps.environment,
  };

  return updatedProps;
}

/**
 * Ensures environment variables that are conditionally included for buildtime or runtime are only used during the
 * appropriate phase.
 */
export function applyConditionalEnvironmentVariables<
  Props extends ExtendedNextjsSiteProps,
>(scope: Construct, id: string, props: Readonly<Props>): Props {
  const updatedProps: Props = { ...props };

  if (!updatedProps.environment) return updatedProps;

  const buildtimeSpecificEnvVars = Object.fromEntries(
    Object.entries(updatedProps.environment)
      .filter(([, value]) => typeof value === "object")
      .map(([varName, value]) => [
        varName,
        typeof value === "object" && "buildtime" in value
          ? value.buildtime
          : undefined,
      ]),
  );

  const runtimeSpecificEnvVars = Object.fromEntries(
    Object.entries(updatedProps.environment)
      .filter(([, value]) => typeof value === "object")
      .map(([varName, value]) => [
        varName,
        typeof value === "object" && "runtime" in value
          ? value.runtime
          : undefined,
      ]),
  );

  console.log("runtimeSpecificEnvVars", runtimeSpecificEnvVars);

  // Remove runtime excluded env vars from lambda
  updatedProps.cdk = updatedProps.cdk ?? {};
  const oldTransform = updatedProps.cdk.transform;
  updatedProps.cdk.transform = (plan: SSTPlan) => {
    oldTransform?.(plan);

    for (const origin of Object.values(plan.origins)) {
      if (!("function" in origin) || !origin.function.environment) {
        continue;
      }
      for (const [envVarName, envVarValue] of Object.entries(
        runtimeSpecificEnvVars,
      )) {
        console.log(
          `Setting runtime specific environment variable ${envVarName} to ${envVarValue}`,
        );
        if (envVarValue !== undefined) {
          console.log("setting");
          origin.function.environment[envVarName] = envVarValue;
        } else {
          console.log("deleting");
          // @ts-expect-error - blar blar
          origin.function.environment[envVarName] = undefined;
        }
      }
    }
    console.log("Transformed plan:", JSON.stringify(plan, null, 2));
  };

  // Remove buildtime excluded env vars from environment object which is used during build
  for (const [envVarName, envVarValue] of Object.entries(
    buildtimeSpecificEnvVars,
  )) {
    if (envVarValue !== undefined) {
      updatedProps.environment[envVarName] = envVarValue;
    } else {
      delete updatedProps.environment[envVarName];
    }
  }

  return updatedProps;
}

/**
 * Before props reach this function they should have already been converted into something compatible with the parent
 * SST construct. This function verifies that's the case and updates the type if so.
 */
export function parentCompatibleSsrProps<
  Props extends ExtendedNextjsSiteProps,
  ResultProps = Omit<Props, "environment"> & {
    environment?: Record<string, string>;
  },
>(props: Readonly<Props>): ResultProps {
  for (const value of Object.values(props.environment ?? {})) {
    if (typeof value !== "string") {
      throw new Error(
        "Internal make-it-so error: The environment prop contains buildtime/runtime specific environment variables which cannot be passed to the parent NextjsSite construct. Please use the applyConditionalEnvironmentVariables function to ensure only appropriate environment variables are included.",
      );
    }
  }
  return props as ResultProps;
}

export function setupDefaultEnvVars<Props extends ExtendedNextjsSiteProps>(
  scope: Construct | Stack,
  id: string,
  props: Readonly<Props>,
): Props {
  const updatedProps: Props = { ...props };
  // NextjsSite functions to not use default env var unfortunately so we have to
  // explicitly set them ourselves https://github.com/sst/sst/issues/2359
  if ("defaultFunctionProps" in scope) {
    for (const funcProps of scope.defaultFunctionProps) {
      const defaultFunctionEnvVars = { ...funcProps.environment };

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
