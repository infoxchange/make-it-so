import { dns } from "@infoxchange/make-it-so/components/ix";
import { ComponentResourceOptions, output } from "@pulumi/pulumi";
import { getDeployConfig } from "@/deployConfig";

const siteConstructs = [
  sst.aws.StaticSite,
  sst.aws.Nextjs,
  sst.aws.Nuxt,
  sst.aws.Remix,
  sst.aws.React,
  sst.aws.TanStackStart,
  sst.aws.Astro,
  sst.aws.SvelteKit,
  sst.aws.SolidStart,
  sst.aws.Analog,
];

type SiteArgs = ConstructorParameters<(typeof siteConstructs)[number]>[1];
type Site = {
  new (name: string, args: SiteArgs, opts?: ComponentResourceOptions): unknown;
};

export function setupComponentDefaults() {
  for (const construct of siteConstructs) {
    $transform(construct as Site, (args, opts, name) => {
      addDefaultDomain(args, name);
    });
  }
}

function addDefaultDomain(args: SiteArgs | undefined, name: string) {
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
