import { Construct } from "constructs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Certificate, ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import { CustomResource } from "aws-cdk-lib";

type ConstructScope = ConstructorParameters<typeof Construct>[0];
type ConstructId = ConstructorParameters<typeof Construct>[1];

type Props = {
  domainName: string;
  subjectAlternativeNames?: string[];
  region?: string;
};

export class IxCertificate extends Construct {
  public acmCertificate: ICertificate;

  constructor(scope: ConstructScope, id: ConstructId, props: Props) {
    super(scope, id);
    this.acmCertificate = this.createCertificate(scope, id, props);
  }

  private createCertificate(
    scope: ConstructScope,
    id: ConstructId,
    props: Props,
  ): ICertificate {
    const certificateCreationLambdaArn =
      StringParameter.valueForStringParameter(
        scope,
        "/shared-services/acm/lambdaArn-v2",
      );
    const certificateCustomResource = new CustomResource(
      scope,
      "DomainCert-" + id,
      {
        resourceType: "Custom::CertIssuingLambda",
        serviceToken: certificateCreationLambdaArn,
        properties: {
          DomainName: props.domainName,
          ...(props.subjectAlternativeNames && {
            SubjectAlternativeNames: props.subjectAlternativeNames,
          }),
          ...(props.region && { CertificateIssuingRegion: props.region }),
        },
      },
    );
    return Certificate.fromCertificateArn(
      scope,
      id + "-AwsCertificate",
      certificateCustomResource.ref,
    );
  }
}
