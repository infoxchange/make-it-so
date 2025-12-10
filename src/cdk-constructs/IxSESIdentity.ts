import { Construct } from "constructs";
import { IxDnsRecord } from "./IxDnsRecord.js";
import * as ses from "aws-cdk-lib/aws-ses";
import * as cdk from "aws-cdk-lib";

type ConstructScope = ConstructorParameters<typeof Construct>[0];
type ConstructId = ConstructorParameters<typeof Construct>[1];

type Props =
  | {
      domain: string;
      mailFromSubdomain?: string;
    }
  | {
      from: string;
    };

export class IxSESIdentity extends Construct {
  constructor(scope: ConstructScope, id: ConstructId, props: Props) {
    const mailFromDomain =
      "from" in props
        ? props.from.split("@")[1]
        : `${props.mailFromSubdomain ?? "mail"}.${props.domain}`;
    const domain =
      "from" in props
        ? mailFromDomain.split(".").slice(1).join(".")
        : props.domain;

    super(scope, id);

    const identity = new ses.EmailIdentity(scope, `${id}EmailIdentity`, {
      identity: ses.Identity.domain(domain),
      mailFromDomain,
    });

    // Based on https://github.com/aws/aws-cdk/blob/e2ef65a26c833ecb4a29c22e070c3c5f01c31995/packages/aws-cdk-lib/aws-ses/lib/email-identity.ts#L247
    for (const i of [1, 2, 3]) {
      new IxDnsRecord(scope, `${id}DkimDnsToken${i}`, {
        type: "CNAME",
        name: identity[
          `dkimDnsTokenName${i}` as
            | "dkimDnsTokenName1"
            | "dkimDnsTokenName2"
            | "dkimDnsTokenName3"
        ],
        value:
          identity[
            `dkimDnsTokenValue${i}` as
              | "dkimDnsTokenValue1"
              | "dkimDnsTokenValue2"
              | "dkimDnsTokenValue3"
          ],
        ttl: 1800,
      });
    }

    // Based on
    // https://github.com/aws/aws-cdk/blob/e2ef65a26c833ecb4a29c22e070c3c5f01c31995/packages/aws-cdk-lib/aws-ses/lib/email-identity.ts#L512
    new IxDnsRecord(scope, `${id}MailFromMxRecord`, {
      type: "MX",
      name: mailFromDomain,
      value: `feedback-smtp.${cdk.Stack.of(scope).region}.amazonses.com`,
      priority: 10,
    });
    new IxDnsRecord(scope, `${id}MailFromTxtRecord`, {
      type: "TXT",
      name: mailFromDomain,
      value: "v=spf1 include:amazonses.com ~all",
    });

    // Set up DMARC record
    new IxDnsRecord(scope, `${id}DMARC`, {
      type: "TXT",
      name: `_dmarc.${domain}`,
      value: "v=DMARC1; p=none;",
    });
  }
}
