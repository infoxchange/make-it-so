import { Bucket } from "sst/constructs";
import { BucketEncryption } from "aws-cdk-lib/aws-s3";
import ixDeployConfig from "../deployConfig.js";
export class IxBucket extends Bucket {
    constructor(scope, id, props = {}) {
        const bucketProps = {
            blockPublicACLs: true,
            ...props,
            cdk: {
                ...props.cdk,
                bucket: {
                    enforceSSL: true,
                    ...(ixDeployConfig.isIxDeploy
                        ? { encryption: BucketEncryption.S3_MANAGED }
                        : {}),
                    ...props.cdk?.bucket,
                },
            },
        };
        super(scope, id, bucketProps);
    }
}
