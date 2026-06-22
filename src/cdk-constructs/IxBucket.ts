import { Bucket } from "sst/constructs";
import { BucketEncryption } from "aws-cdk-lib/aws-s3";
import ixDeployConfig from "../deployConfig.js";

type ConstructScope = ConstructorParameters<typeof Bucket>[0];
type ConstructId = ConstructorParameters<typeof Bucket>[1];
type ConstructProps = Exclude<
  ConstructorParameters<typeof Bucket>[2],
  undefined
>;

export class IxBucket extends Bucket {
  constructor(
    scope: ConstructScope,
    id: ConstructId,
    props: ConstructProps = {},
  ) {
    const bucketProps: ConstructProps = {
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
