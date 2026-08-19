import { Construct } from "constructs";
import CloudFront from "aws-cdk-lib/aws-cloudfront";
import CDK from "aws-cdk-lib";
import * as SST from "sst/constructs";
import type { ExtendedNextjsSiteProps, ExtendedStaticSiteProps } from "../../lib/site/support.js";
type ConstructScope = ConstructorParameters<typeof Construct>[0];
type ConstructId = ConstructorParameters<typeof Construct>[1];
export type Props = {
    oidcIssuerUrl: string;
    oidcClientId: string;
    oidcScope: string;
};
export type AddToSiteProps = {
    prefix?: string;
};
export declare class SiteOidcAuth extends Construct {
    readonly oidcIssuerUrl: string;
    readonly oidcClientId: string;
    readonly oidcScope: string;
    readonly id: string;
    constructor(scope: ConstructScope, id: ConstructId, props: Props);
    addToStaticSiteProps<SiteProps extends ExtendedStaticSiteProps>(scope: ConstructScope, siteProps: SiteProps, { prefix }?: AddToSiteProps): SiteProps & {
        cdk: {
            distribution: {
                additionalBehaviors: Record<string, CloudFront.BehaviorOptions>;
                defaultBehavior: {
                    functionAssociations: CloudFront.FunctionAssociation[];
                    allowedMethods?: CloudFront.AllowedMethods | undefined;
                    cachedMethods?: CloudFront.CachedMethods | undefined;
                    cachePolicy?: CloudFront.ICachePolicy | undefined;
                    compress?: boolean | undefined;
                    originRequestPolicy?: CloudFront.IOriginRequestPolicy | undefined;
                    realtimeLogConfig?: CloudFront.IRealtimeLogConfig | undefined;
                    responseHeadersPolicy?: CloudFront.IResponseHeadersPolicy | undefined;
                    smoothStreaming?: boolean | undefined;
                    viewerProtocolPolicy?: CloudFront.ViewerProtocolPolicy | undefined;
                    edgeLambdas?: CloudFront.EdgeLambda[] | undefined;
                    trustedKeyGroups?: CloudFront.IKeyGroup[] | undefined;
                    enableGrpc?: boolean | undefined;
                    origin?: CloudFront.IOrigin | undefined;
                };
            } | {
                additionalBehaviors: Record<string, CloudFront.BehaviorOptions>;
                defaultBehavior: {
                    functionAssociations: CloudFront.FunctionAssociation[];
                    allowedMethods?: CloudFront.AllowedMethods | undefined;
                    cachedMethods?: CloudFront.CachedMethods | undefined;
                    cachePolicy?: CloudFront.ICachePolicy | undefined;
                    compress?: boolean | undefined;
                    originRequestPolicy?: CloudFront.IOriginRequestPolicy | undefined;
                    realtimeLogConfig?: CloudFront.IRealtimeLogConfig | undefined;
                    responseHeadersPolicy?: CloudFront.IResponseHeadersPolicy | undefined;
                    smoothStreaming?: boolean | undefined;
                    viewerProtocolPolicy?: CloudFront.ViewerProtocolPolicy | undefined;
                    edgeLambdas?: CloudFront.EdgeLambda[] | undefined;
                    trustedKeyGroups?: CloudFront.IKeyGroup[] | undefined;
                    enableGrpc?: boolean | undefined;
                    origin?: CloudFront.IOrigin | undefined;
                };
                distributionDomainName: string;
                distributionId: string;
                distributionArn: string;
                grant(identity: CDK.aws_iam.IGrantable, ...actions: string[]): CDK.aws_iam.Grant;
                grantCreateInvalidation(identity: CDK.aws_iam.IGrantable): CDK.aws_iam.Grant;
                stack: CDK.Stack;
                env: CDK.ResourceEnvironment;
                applyRemovalPolicy(policy: CDK.RemovalPolicy): void;
                node: import("constructs").Node;
            } | {
                additionalBehaviors: Record<string, CloudFront.BehaviorOptions>;
                defaultBehavior: {
                    functionAssociations: CloudFront.FunctionAssociation[];
                    allowedMethods?: CloudFront.AllowedMethods | undefined;
                    cachedMethods?: CloudFront.CachedMethods | undefined;
                    cachePolicy?: CloudFront.ICachePolicy | undefined;
                    compress?: boolean | undefined;
                    originRequestPolicy?: CloudFront.IOriginRequestPolicy | undefined;
                    realtimeLogConfig?: CloudFront.IRealtimeLogConfig | undefined;
                    responseHeadersPolicy?: CloudFront.IResponseHeadersPolicy | undefined;
                    smoothStreaming?: boolean | undefined;
                    viewerProtocolPolicy?: CloudFront.ViewerProtocolPolicy | undefined;
                    edgeLambdas?: CloudFront.EdgeLambda[] | undefined;
                    trustedKeyGroups?: CloudFront.IKeyGroup[] | undefined;
                    enableGrpc?: boolean | undefined;
                    origin?: CloudFront.IOrigin | undefined;
                };
                certificate?: CDK.aws_certificatemanager.ICertificate | undefined;
                comment?: string | undefined;
                defaultRootObject?: string | undefined;
                domainNames?: string[] | undefined;
                enabled?: boolean | undefined;
                enableIpv6?: boolean | undefined;
                enableLogging?: boolean | undefined;
                geoRestriction?: CloudFront.GeoRestriction | undefined;
                httpVersion?: CloudFront.HttpVersion | undefined;
                logBucket?: CDK.aws_s3.IBucket | undefined;
                logIncludesCookies?: boolean | undefined;
                logFilePrefix?: string | undefined;
                priceClass?: CloudFront.PriceClass | undefined;
                webAclId?: string | undefined;
                errorResponses?: CloudFront.ErrorResponse[] | undefined;
                minimumProtocolVersion?: CloudFront.SecurityPolicyProtocol | undefined;
                sslSupportMethod?: CloudFront.SSLMethod | undefined;
                publishAdditionalMetrics?: boolean | undefined;
            };
            id?: string | undefined;
            bucket?: CDK.aws_s3.IBucket | CDK.aws_s3.BucketProps | undefined;
        };
    };
    addToSsrSiteProps<SiteProps extends ExtendedNextjsSiteProps>(scope: ConstructScope, siteProps: SiteProps, { prefix }?: AddToSiteProps): SiteProps & {
        cdk: {
            distribution: {
                additionalBehaviors: Record<string, CloudFront.BehaviorOptions>;
                defaultBehavior?: (Omit<CloudFront.BehaviorOptions, "origin"> & {
                    origin?: CloudFront.IOrigin | undefined;
                }) | undefined;
                certificate?: CDK.aws_certificatemanager.ICertificate | undefined;
                comment?: string | undefined;
                defaultRootObject?: string | undefined;
                domainNames?: string[] | undefined;
                enabled?: boolean | undefined;
                enableIpv6?: boolean | undefined;
                enableLogging?: boolean | undefined;
                geoRestriction?: CloudFront.GeoRestriction | undefined;
                httpVersion?: CloudFront.HttpVersion | undefined;
                logBucket?: CDK.aws_s3.IBucket | undefined;
                logIncludesCookies?: boolean | undefined;
                logFilePrefix?: string | undefined;
                priceClass?: CloudFront.PriceClass | undefined;
                webAclId?: string | undefined;
                errorResponses?: CloudFront.ErrorResponse[] | undefined;
                minimumProtocolVersion?: CloudFront.SecurityPolicyProtocol | undefined;
                sslSupportMethod?: CloudFront.SSLMethod | undefined;
                publishAdditionalMetrics?: boolean | undefined;
            };
            id?: string | undefined;
            bucket?: CDK.aws_s3.IBucket | CDK.aws_s3.BucketProps | undefined;
            s3Origin?: CDK.aws_cloudfront_origins.S3OriginProps | undefined;
            serverCachePolicy?: CloudFront.ICachePolicy | undefined;
            responseHeadersPolicy?: CloudFront.IResponseHeadersPolicy | undefined;
            viewerProtocolPolicy?: CloudFront.ViewerProtocolPolicy | undefined;
            server?: (Pick<CDK.aws_lambda.FunctionProps, "vpc" | "layers" | "vpcSubnets" | "securityGroups" | "allowAllOutbound" | "allowPublicSubnet" | "architecture" | "logRetention"> & Pick<SST.FunctionProps, "copyFiles">) | undefined;
            transform?: ((args: {
                cloudFrontFunctions?: Record<string, import("sst/constructs/SsrSite.js").CloudFrontFunctionConfig> | undefined;
                edgeFunctions?: Record<string, import("sst/constructs/SsrSite.js").EdgeFunctionConfig> | undefined;
                origins: Record<string, import("sst/constructs/SsrSite.js").FunctionOriginConfig | import("sst/constructs/SsrSite.js").ImageOptimizationFunctionOriginConfig | import("sst/constructs/SsrSite.js").S3OriginConfig | import("sst/constructs/SsrSite.js").OriginGroupConfig>;
                edge: boolean;
                behaviors: {
                    cacheType: "server" | "static";
                    pattern?: string | undefined;
                    origin: string;
                    allowedMethods?: CloudFront.AllowedMethods | undefined;
                    cfFunction?: string | undefined;
                    edgeFunction?: string | undefined;
                }[];
                errorResponses?: CloudFront.ErrorResponse[] | undefined;
                serverCachePolicy?: {
                    allowedHeaders?: string[] | undefined;
                } | undefined;
                buildId?: string | undefined;
                warmer?: {
                    function: string;
                } | undefined;
            }) => void) | undefined;
            revalidation?: Pick<CDK.aws_lambda.FunctionProps, "vpc" | "vpcSubnets"> | undefined;
        };
    };
    private createJwtSecret;
    private getFunctionAssociation;
    private getAuthCheckHandlerBodyCode;
    private convertToCloudFrontFunctionCompatibleCode;
    private getAuthBehaviorOptions;
}
export {};
//# sourceMappingURL=index.d.ts.map