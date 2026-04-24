// Based on https://github.com/anomalyco/sst/blob/3407c32b2cf97b85ea96a92361c6f4a0a8d55200/platform/src/components/aws/dns.ts
/**
 * The AWS DNS Adapter is used to create DNS records to manage domains hosted on
 * [Route 53](https://aws.amazon.com/route53/).
 *
 * This adapter is passed in as `domain.dns` when setting a custom domain.
 *
 * @example
 *
 * ```ts
 * {
 *   domain: {
 *     name: "example.com",
 *     dns: sst.aws.dns()
 *   }
 * }
 * ```
 *
 * You can also specify a hosted zone ID if you have multiple hosted zones with the same domain.
 *
 * ```ts
 * {
 *   domain: {
 *     name: "example.com",
 *     dns: sst.aws.dns({
 *       zone: "Z2FDTNDATAQYW2"
 *     })
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

import {
  AliasRecord,
  Dns,
  Record as DnsRecord,
} from "sst3/platform/src/components/dns";
import { logicalName } from "sst3/platform/src/components/naming";
import { ComponentResourceOptions, output } from "@pulumi/pulumi";
import { Transform, transform } from "sst3/platform/src/components/component";
import { Input } from "sst3/platform/src/components/input";
import { useProvider } from "sst3/platform/src/components/aws/helpers/provider";
import { route53 } from "@pulumi/aws";
import { VisibleError } from "sst3/platform/src/components/error";
import * as aws from "@pulumi/aws";

export interface DnsArgs {
  /**
   * Set the hosted zone ID if you have multiple hosted zones that have the same
   * domain in Route 53.
   *
   * The 14 letter ID of the [Route 53 hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-working-with.html) that contains the `domainName`. You can find the hosted zone ID in the Route 53 part of the AWS Console.
   *
   * @example
   * ```js
   * {
   *   zone: "Z2FDTNDATAQYW2"
   * }
   * ```
   */
  zone?: Input<string>;
  /**
   * Set to `true` if you want to let the new DNS records replace the existing ones.
   *
   * :::tip
   * Use this to migrate over your domain without any downtime.
   * :::
   *
   * This is useful if your domain is currently used by another app and you want to switch it
   * to your current app. Without setting this, you'll first have to remove the existing DNS
   * records and then add the new one. This can cause downtime.
   *
   * You can avoid this by setting this to `true` and the existing DNS records will be replaced
   * without any downtime. Just make sure that when you remove your old app, you don't remove
   * the DNS records.
   *
   * @default `false`
   * @example
   * ```js
   * {
   *   override: true
   * }
   * ```
   */
  override?: Input<boolean>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the AWS Route 53 record resource.
     */
    record?: Transform<
      route53.RecordArgs & {
        aliasIpType?: "IPv4" | "IPv6";
        // Can be used to override the raw input to the IX DNS lambda
        lambdaInput?: Record<string, unknown>;
      }
    >;
  };
}

export function dns(args: DnsArgs = {}) {
  return {
    provider: "aws",
    createAlias,
    createCaa,
    createRecord,
  } satisfies Dns;

  /**
   * Creates alias records in the hosted zone.
   *
   * @param namePrefix The prefix to use for the resource names.
   * @param record The alias record to create.
   * @param opts The component resource options.
   */
  function createAlias(
    namePrefix: string,
    record: AliasRecord,
    opts: ComponentResourceOptions,
  ) {
    return ["A", "AAAA"].map((type) =>
      _createRecord(
        namePrefix,
        {
          type,
          name: record.name,
          aliases: [
            {
              name: record.aliasName,
              zoneId: record.aliasZone,
              evaluateTargetHealth: true,
            },
          ],
        },
        opts,
      ),
    );
  }

  function createCaa(
    /* eslint-disable @typescript-eslint/no-unused-vars -- Kept for typing even though it's not used for this
    implementation of Dns */
    namePrefix: string,
    recordName: string,
    opts: ComponentResourceOptions,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  ) {
    // placeholder
    return undefined;
  }

  /**
   * Creates a DNS record in the hosted zone.
   *
   * @param namePrefix The prefix to use for the resource names.
   * @param record The DNS record to create.
   * @param opts The component resource options.
   */
  function createRecord(
    namePrefix: string,
    record: DnsRecord,
    opts: ComponentResourceOptions,
  ) {
    return _createRecord(
      namePrefix,
      {
        type: record.type,
        name: record.name,
        ttl: 60,
        records: [record.value],
      },
      opts,
    );
  }

  function _createRecord(
    namePrefix: string,
    partial: Omit<route53.RecordArgs, "zoneId">,
    opts: ComponentResourceOptions,
  ) {
    return output(partial).apply((partial) => {
      const nameSuffix = logicalName(partial.name);
      const zoneId = ""; // The IX dns lambda will determine the zone ID based on the domain name
      const dnsRecord = createRecord();
      return dnsRecord;

      function createRecord() {
        const [name, mergedArgs, mergedOpts] = transform(
          args.transform?.record,
          `${namePrefix}${partial.type}Record${nameSuffix}`,
          {
            zoneId,
            allowOverwrite: args.override,
            ...partial,
          },
          opts,
        );
        const lambdaInput = output(mergedArgs).apply((mergedArgs) => {
          const { aliases } = mergedArgs;
          let { aliasIpType } = mergedArgs;
          if (aliases && aliases.length > 1) {
            throw new VisibleError(
              "Aliases with multiple targets are not supported",
            );
          }
          const [alias] = aliases || [];
          if (alias) {
            if (mergedArgs.type === "A") {
              aliasIpType = "IPv4";
            } else if (mergedArgs.type === "AAAA") {
              aliasIpType = "IPv6";
            } else {
              throw new VisibleError(
                "Alias records can only be created for A or AAAA record types",
              );
            }
          }
          return {
            RecordType: mergedArgs.type,
            // Even though a trailing dot is valid a bug in the IX dns lambda means that an error occurs
            // when trying to find the hosted zone if there is a trailing dot.
            RecordFQDN: mergedArgs.name.replace(/\.$/, ""),
            // If giving the IX dns lambda multiple values we need to wrap in 'Value' objects
            // unlike for single values where the lambda does it for us
            // https://github.com/InfoxchangeTS/aws-gov/blob/213609c2e91b021375b93290efdaf38936ee98e1/components/xaccount-route53/dns-record-updater-lambda/src/index.py#L133
            RecordValue: mergedArgs.records?.map((value) => ({ Value: value })),
            ...(mergedArgs.zoneId ? { HostedZoneId: mergedArgs.zoneId } : {}),
            ...(mergedArgs.ttl ? { RecordTTL: mergedArgs.ttl } : {}),
            ...(alias
              ? {
                  RecordType: "ALIAS",
                  // https://github.com/InfoxchangeTS/aws-gov/blob/213609c2e91b021375b93290efdaf38936ee98e1/components/xaccount-route53/dns-record-updater-lambda/src/index.py#L145
                  RecordValue: alias.name,
                  // https://github.com/InfoxchangeTS/aws-gov/blob/213609c2e91b021375b93290efdaf38936ee98e1/components/xaccount-route53/dns-record-updater-lambda/src/index.py#L144
                  AliasZoneId: alias.zoneId,
                  // alias.evaluateTargetHealth can't be set by the lambda
                  IpAddressType: aliasIpType?.toLowerCase(),
                }
              : {}),
            ...mergedArgs.lambdaInput,
          };
        });
        // output([mergedArgs, lambdaInput]).apply(([mergedArgs, lambdaInput]) => console.log('________ BEFORE', mergedArgs, '___________ AFTER', lambdaInput));
        return new aws.lambda.Invocation(
          name,
          {
            input: output(lambdaInput).apply((lambdaInput) =>
              JSON.stringify({
                RequestType: "Create",
                ResourceProperties: lambdaInput,
                // We need some value so that the lambda doesn't throw an error but we don't want the lambda to actually
                // send a response to this url (the response is for CloudFormation which we're not using). Setting an
                // invalid domain will cause it to log an error but not throw so the lambda is considered successful.
                ResponseURL: "invalid://make-it-so-dns",
                StackId: "",
                RequestId: "",
                LogicalResourceId: "",
              }),
            ),
            functionName: aws.ssm
              .getParameter({
                name: "/shared-services/route53/lambdaArn",
              })
              .then((param) => param.value),
          },
          {
            ...mergedOpts,
            // Function can only be invoked from within the same region it is deployed
            provider: useProvider("ap-southeast-2"),
          },
        );
      }
    });
  }
}
