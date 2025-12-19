import { Construct } from "constructs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { CustomResource } from "aws-cdk-lib";
import { remapKeys } from "../lib/utils/objects.js";

type ConstructScope = ConstructorParameters<typeof Construct>[0];
type ConstructId = ConstructorParameters<typeof Construct>[1];

type Props = {
  name: string;
  value: string;
  ttl?: number;
  hostedZoneId?: string;
} & (
  | {
      type: "A" | "CNAME" | "NS" | "SOA" | "TXT";
    }
  | {
      type: "ALIAS";
      aliasZoneId: string;
    }
  | {
      type: "MX";
      priority: number;
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
    const keysMap = {
      name: "RecordFQDN",
      value: "RecordValue",
      ttl: "RecordTTL",
      hostedZoneId: "HostedZoneId",
      type: "RecordType",
      aliasZoneId: "AliasZoneId",
    };
    let lambdaProps;
    if (constructProps.type === "TXT") {
      lambdaProps = remapKeys(
        {
          ...constructProps,
          value: `"${constructProps.value}"`,
        },
        keysMap,
      );
    } else if (constructProps.type === "MX") {
      const { priority, ...rest } = constructProps;
      lambdaProps = remapKeys(
        {
          ...rest,
          value: `${priority} ${rest.value}`,
        },
        keysMap,
      );
    } else {
      lambdaProps = remapKeys(constructProps, keysMap);
    }

    new CustomResource(scope, id + "-CertificateCustomResource", {
      resourceType: "Custom::DNSRecordUpdaterLambda",
      serviceToken: dnsRecordUpdaterLambdaArn,
      properties: lambdaProps,
    });
  }
}
