import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";
/**
 * Properties to configure an HTTPS Redirect
 */
export interface WebsiteRedirectProps {
    /**
     * The redirect target fully qualified domain name (FQDN). An alias record
     * will be created that points to your CloudFront distribution. Root domain
     * or sub-domain can be supplied.
     */
    readonly targetDomain: string;
    /**
     * The domain names that will redirect to `targetDomain`
     *
     * @default - the domain name of the hosted zone
     */
    readonly recordNames: string[];
    /**
     * The AWS Certificate Manager (ACM) certificate that will be associated with
     * the CloudFront distribution that will be created. If provided, the certificate must be
     * stored in us-east-1 (N. Virginia)
     *
     * @default - A new certificate is created in us-east-1 (N. Virginia)
     */
    readonly certificate?: ICertificate;
}
/**
 * Allows creating a domainA -> domainB redirect using CloudFront and S3.
 * You can specify multiple domains to be redirected.
 */
export declare class IxWebsiteRedirect extends Construct {
    constructor(scope: Construct, id: string, props: WebsiteRedirectProps);
}
//# sourceMappingURL=IxWebsiteRedirect.d.ts.map