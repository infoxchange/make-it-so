// Based off https://github.com/sst/v2/blob/37578037ff80638e2f0eaf0dc59a83dae52e4e45/packages/sst/src/constructs/cdk/website-redirect.ts

import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  CloudFrontWebDistribution,
  OriginProtocolPolicy,
  PriceClass,
  ViewerCertificate,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import {
  BlockPublicAccess,
  Bucket,
  RedirectProtocol,
} from "aws-cdk-lib/aws-s3";
import { ArnFormat, RemovalPolicy, Stack, Token } from "aws-cdk-lib/core";
import { Construct } from "constructs";
import { convertToBase62Hash } from "../lib/utils/hash.js";
import { IxDnsRecord } from "./IxDnsRecord.js";

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
  readonly certificate: ICertificate;
}

/**
 * Allows creating a domainA -> domainB redirect using CloudFront and S3.
 * You can specify multiple domains to be redirected.
 */
export class IxWebsiteRedirect extends Construct {
  constructor(scope: Construct, id: string, props: WebsiteRedirectProps) {
    super(scope, id);

    const domainNames = props.recordNames;

    const certificateRegion = Stack.of(this).splitArn(
      props.certificate.certificateArn,
      ArnFormat.SLASH_RESOURCE_NAME,
    ).region;
    if (
      !Token.isUnresolved(certificateRegion) &&
      certificateRegion !== "us-east-1"
    ) {
      throw new Error(
        `The certificate must be in the us-east-1 region and the certificate you provided is in ${certificateRegion}.`,
      );
    }

    const redirectCert = props.certificate;

    const redirectBucket = new Bucket(this, "RedirectBucket", {
      websiteRedirect: {
        hostName: props.targetDomain,
        protocol: RedirectProtocol.HTTPS,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });
    const redirectDist = new CloudFrontWebDistribution(
      this,
      "RedirectDistribution",
      {
        defaultRootObject: "",
        originConfigs: [
          {
            behaviors: [{ isDefaultBehavior: true }],
            customOriginSource: {
              domainName: redirectBucket.bucketWebsiteDomainName,
              originProtocolPolicy: OriginProtocolPolicy.HTTP_ONLY,
            },
          },
        ],
        viewerCertificate: ViewerCertificate.fromAcmCertificate(redirectCert, {
          aliases: domainNames,
        }),
        comment: `Redirect to ${props.targetDomain} from ${domainNames.join(
          ", ",
        )}`,
        priceClass: PriceClass.PRICE_CLASS_ALL,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    );

    for (const domainName of domainNames) {
      const domainNameLogicalId = convertToBase62Hash(domainName);

      new IxDnsRecord(scope, `DnsRecord-Redirect-${domainNameLogicalId}`, {
        type: "ALIAS",
        name: domainName,
        value: redirectDist.distributionDomainName,
        aliasZoneId: CloudFrontTarget.getHostedZoneId(scope),
        ttl: 900,
      });
    }
  }
}
