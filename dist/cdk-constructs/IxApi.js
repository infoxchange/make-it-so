import { Api } from "sst/constructs";
import { IxCertificate } from "./IxCertificate.js";
import { IxDnsRecord } from "./IxDnsRecord.js";
import ixDeployConfig from "../deployConfig.js";
import { convertToBase62Hash } from "../lib/utils/hash.js";
export class IxApi extends Api {
    constructor(scope, id, props = {}) {
        if (ixDeployConfig.isIxDeploy) {
            IxApi.setupCustomDomain(scope, id, props);
        }
        super(scope, id, props);
        if (ixDeployConfig.isIxDeploy) {
            this.createDnsRecords(scope);
        }
    }
    // This must be static because we need to call it in the constructor before super
    static setupCustomDomain(scope, id, props) {
        // Default to using domains names passed in by the pipeline as the custom domain
        if (ixDeployConfig.isIxDeploy && !("customDomain" in props)) {
            props.customDomain = {
                domainName: ixDeployConfig.siteDomains[0],
            };
        }
        this.setupCertificate(scope, id, props);
    }
    // This must be static because we need to call it in the constructor before super
    static setupCertificate(scope, id, props) {
        if (!props?.customDomain)
            return;
        if (typeof props.customDomain === "string") {
            props.customDomain = { domainName: props.customDomain };
        }
        const domainName = props.customDomain.domainName;
        if (domainName) {
            const domainCert = new IxCertificate(scope, id + "-IxCertificate", {
                domainName,
                region: "ap-southeast-2", // API Gateway wants southeast-2.
            });
            props.customDomain.isExternalDomain = true;
            props.customDomain.cdk = props.customDomain.cdk ?? {};
            props.customDomain.cdk.certificate = domainCert.acmCertificate;
        }
    }
    createDnsRecords(scope) {
        if (this.cdk.domainName?.name && this.cdk.domainName?.regionalDomainName) {
            const domainNameLogicalId = convertToBase62Hash(this.cdk.domainName.name);
            // API Gateway has a separate domain for using with a CNAME (regionalDomainName)
            new IxDnsRecord(scope, `DnsRecord-${domainNameLogicalId}`, {
                type: "CNAME",
                name: this.cdk.domainName.name,
                value: this.cdk.domainName?.regionalDomainName,
                ttl: 900,
            });
        }
    }
}
