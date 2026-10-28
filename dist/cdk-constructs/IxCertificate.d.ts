import { Construct } from "constructs";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
type ConstructScope = ConstructorParameters<typeof Construct>[0];
type ConstructId = ConstructorParameters<typeof Construct>[1];
type Props = {
    domainName: string;
    subjectAlternativeNames?: string[];
    region?: string;
};
export declare class IxCertificate extends Construct {
    acmCertificate: ICertificate;
    constructor(scope: ConstructScope, id: ConstructId, props: Props);
    private createCertificate;
}
export {};
//# sourceMappingURL=IxCertificate.d.ts.map