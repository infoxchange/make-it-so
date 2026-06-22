import { Construct } from "constructs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { CustomResource } from "aws-cdk-lib";
export class IxCertificate extends Construct {
    acmCertificate;
    constructor(scope, id, props) {
        super(scope, id);
        this.acmCertificate = this.createCertificate(scope, id, props);
    }
    createCertificate(scope, id, props) {
        const certificateCreationLambdaArn = StringParameter.valueForStringParameter(scope, "/shared-services/acm/lambdaArn-v2");
        const certificateCustomResource = new CustomResource(scope, "DomainCert-" + id, {
            resourceType: "Custom::CertIssuingLambda",
            serviceToken: certificateCreationLambdaArn,
            properties: {
                DomainName: props.domainName,
                ...(props.subjectAlternativeNames && {
                    SubjectAlternativeNames: props.subjectAlternativeNames,
                }),
                ...(props.region && { CertificateIssuingRegion: props.region }),
            },
        });
        return Certificate.fromCertificateArn(scope, id + "-AwsCertificate", certificateCustomResource.ref);
    }
}
