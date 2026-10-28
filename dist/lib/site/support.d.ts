import { Construct } from "constructs";
import { NextjsSite, NextjsSiteProps, Stack, StaticSite, StaticSiteProps } from "sst/constructs";
import { type DistributionDomainProps } from "sst/constructs/Distribution.js";
import { type AddToSiteProps as SiteOidcAuthAddToSiteProps } from "../../cdk-constructs/SiteOidcAuth/index.js";
type SharedExtendedSiteProps = {
    customDomain?: string | ExtendedCustomDomains;
    auth?: {
        oidc: {
            issuerUrl: string;
            clientId: string;
            scope: string;
        };
    } & SiteOidcAuthAddToSiteProps;
};
export type ExtendedCustomDomains = DistributionDomainProps & {
    isIxManagedDomain?: boolean;
    additionalDomainAliases?: string[];
};
export type ExtendedNextjsSiteProps = Omit<NextjsSiteProps, "customDomain" | "environment"> & SharedExtendedSiteProps & {
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
    environment?: Record<string, string | {
        buildtime?: string;
        runtime?: string;
    }>;
};
export type ExtendedStaticSiteProps = Omit<StaticSiteProps, "customDomain"> & SharedExtendedSiteProps;
export declare function setupCustomDomain<Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps>(scope: Construct, id: string, props: Readonly<Props>): Props;
export declare function setupCertificate<Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps>(scope: Construct, id: string, props: Readonly<Props>): Props;
export declare function setupDomainAliasRedirect<Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps>(scope: Construct, id: string, props: Readonly<Props>): Props;
export declare function setupVpcDetails<Props extends ExtendedNextjsSiteProps>(scope: Construct, id: string, props: Readonly<Props>): Props;
/**
 * Ensures environment variables that are conditionally included for buildtime or runtime are only used during the
 * appropriate phase.
 */
export declare function applyConditionalEnvironmentVariables<Props extends ExtendedNextjsSiteProps>(scope: Construct, id: string, props: Readonly<Props>): Props;
/**
 * Before props reach this function they should have already been converted into something compatible with the parent
 * SST construct. This function verifies that's the case and updates the type if so.
 */
export declare function parentCompatibleSsrProps<Props extends ExtendedNextjsSiteProps, ResultProps = Omit<Props, "environment"> & {
    environment?: Record<string, string>;
}>(props: Readonly<Props>): ResultProps;
export declare function setupDefaultEnvVars<Props extends ExtendedNextjsSiteProps>(scope: Construct | Stack, id: string, props: Readonly<Props>): Props;
export declare function setupDnsRecords<Instance extends NextjsSite | StaticSite, Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps>(instance: Instance, scope: Construct, id: string, props: Readonly<Props>): void;
export declare function getCustomDomains<Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps>(props: Readonly<Props>): string[];
export declare function getPrimaryDomain<Instance extends NextjsSite | StaticSite, Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps>(instance: Instance, props: Readonly<Props>): string | null;
export declare function getPrimaryOrigin<Instance extends NextjsSite | StaticSite, Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps>(instance: Instance, props: Readonly<Props>): string | null;
export declare function getPrimaryCustomDomain<Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps>(props: Readonly<Props>): string | null;
export declare function getAliasDomain<Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps>(props: Readonly<Props>): string | null;
export declare function getAlternativeDomains<Props extends ExtendedStaticSiteProps | ExtendedNextjsSiteProps>(props: Readonly<Props>): string[];
export declare function processAuthProps<SiteType extends "StaticSite" | "SsrSite", Props extends SiteType extends "StaticSite" ? ExtendedStaticSiteProps : ExtendedNextjsSiteProps>(scope: Construct, id: string, siteType: SiteType, props: Readonly<Props>): Props;
export {};
//# sourceMappingURL=support.d.ts.map