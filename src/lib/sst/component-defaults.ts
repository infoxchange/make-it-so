import { $transform as sst3$transform } from "sst3/platform/src/components/component";
import type * as aws from "sst3/platform/src/components/aws";
import type * as cloudflare from "sst3/platform/src/components/cloudflare";
import { dns } from "@/components/ix/dns";
import { output } from "@pulumi/pulumi";
import { getDeployConfig } from "@/deployConfig";

export default function setupComponentDefaults({
  $transform,
  sst: partiallyTypedSst,
}: {
  $transform: typeof sst3$transform;
  sst: {
    /* eslint-disable @typescript-eslint/no-explicit-any -- SST works by creating types dynamically in the
            project where it's used. Therefore we can't import them in this library. For the sake of ensuring the
            correctness of this code we cast to equivalent classes from the "sst3" module we download directly from
            GitHub since we can't guarantee the whole type will exactly match.
             */
    aws: {
      StaticSite: any;
      Nextjs: any;
    };
    cloudflare: {
      StaticSite: any;
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
  };
}) {
  const sst: {
    aws: {
      StaticSite: typeof aws.StaticSite;
      Nextjs: typeof aws.Nextjs;
    };
    cloudflare: {
      StaticSite: typeof cloudflare.StaticSite;
    };
  } = partiallyTypedSst;

  $transform(sst.aws.StaticSite, (args, opts, name) => {
    addDefaultDomain(args, name);
  });
  $transform(sst.aws.Nextjs, (args, opts, name) => {
    addDefaultDomain(args, name);
  });
  $transform(sst.cloudflare.StaticSite, (args, opts, name) => {
    addDefaultDomain(args, name);
  });
}

function addDefaultDomain(
  args:
    | aws.StaticSiteArgs
    | aws.NextjsArgs
    | cloudflare.StaticSiteArgs
    | undefined,
  name: string,
) {
  if (!args) {
    throw new Error(`No args provided to ${name}`);
  }
  const domainArgs = {
    name: getDeployConfig().siteDomains[0],
    dns: dns(),
  };
  if (!("domain" in args)) {
    args.domain = domainArgs;
  } else if (args.domain) {
    args.domain = output(args.domain).apply((domain) => {
      if (typeof domain === "string") {
        return {
          name: domain,
          dns: domainArgs.dns,
        };
      } else if (!("dns" in domain)) {
        domain.dns = domainArgs.dns;
      }
      return domain;
    });
  }
}
