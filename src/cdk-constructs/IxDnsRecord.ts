import { Construct } from "constructs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { CustomResource } from "aws-cdk-lib";
import { remapKeys } from "../shared.js";

type ConstructScope = ConstructorParameters<typeof Construct>[0];
type ConstructId = ConstructorParameters<typeof Construct>[1];

type Props = {
  name: string;
  value: string;
  ttl?: number;
  hostedZoneId?: string;
} & (
  | {
      type: "A" | "CNAME" | "NS" | "SOA";
    }
  | {
      type: "ALIAS";
      aliasZoneId: string;
    }
);

export class IxDnsRecord extends Construct {
  constructor(scope: ConstructScope, id: ConstructId, props: Props) {
    super(scope, id);
    this.createDnsRecord(scope, id, props);
  }

  private createDnsRecord(
    scope: ConstructScope,
    id: ConstructId,
    constructProps: Props,
  ): void {
    const dnsRecordUpdaterLambdaArn = StringParameter.valueForStringParameter(
      scope,
      "/shared-services/route53/lambdaArn",
    );

    const lambdaProps = remapKeys(constructProps, {
      name: "RecordFQDN",
      value: "RecordValue",
      ttl: "RecordTTL",
      hostedZoneId: "HostedZoneId",
      type: "RecordType",
      aliasZoneId: "AliasZoneId",
    });

    new CustomResource(scope, id + "-CertificateCustomResource", {
      resourceType: "Custom::DNSRecordUpdaterLambda",
      serviceToken: dnsRecordUpdaterLambdaArn,
      properties: lambdaProps,
    });
  }
}
