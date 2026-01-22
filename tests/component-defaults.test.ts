import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  cleanupSstGlobals,
  setupSstGlobals,
  getCapturedTransformCallback,
} from "./mocks/sst-globals.js";
import {
  assertDefined,
  assertIsObject,
  unwrapOutput,
} from "./helpers/test-utils.js";
import { StaticSiteArgs } from "sst3/platform/src/components/aws/static-site.js";

describe("setup", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    // Reset SST globals to default mocks since tests override them
    cleanupSstGlobals();
    setupSstGlobals();
  });

  it("should export setup function", async () => {
    const module = await import("../src/components/setup-components.js");

    expect(module.setup).toBeDefined();
    expect(typeof module.setup).toBe("function");
  });

  it("should call $transform for each component type", async () => {
    const { setup } = await import("../src/components/setup-components.js");

    setup();

    // Should be called once for each site component (10 total)
    expect($transform).toHaveBeenCalledTimes(10);

    // Verify it's called with each site constructor
    expect($transform).toHaveBeenCalledWith(
      sst.aws.StaticSite,
      expect.any(Function),
    );
    expect($transform).toHaveBeenCalledWith(
      sst.aws.Nextjs,
      expect.any(Function),
    );
  });

  it("should add default domain to site constructs without domain", async () => {
    const { setup } = await import("../src/components/setup-components.js");

    setup();

    const transformCallback = getCapturedTransformCallback();
    assertDefined(transformCallback);

    // Mock args without a domain
    const args: StaticSiteArgs = {
      path: "./site",
    };

    // Call the transform callback
    transformCallback(args, {}, "TestSite");

    // Verify domain was added
    assertDefined(args.domain);
    const domain = await unwrapOutput(args.domain);
    assertIsObject(domain);
    expect(domain.name).toBeDefined();
    expect(domain.dns).toBeDefined();
  });

  it("should add dns to string domain in site constructs", async () => {
    const { setup } = await import("../src/components/setup-components.js");

    setup();

    const transformCallback = getCapturedTransformCallback();
    assertDefined(transformCallback);

    // Mock args with a string domain
    const args: StaticSiteArgs = {
      path: "./site",
      domain: "example.com",
    };

    // Call the transform callback (domain is an Output, so it needs to be processed)
    transformCallback(args, {}, "TestSite");

    // Verify domain was converted to object with dns
    assertDefined(args.domain);
    assertIsObject(args.domain);

    // Unwrap the Output to check the actual value
    const unwrappedDomain = await unwrapOutput(args.domain);
    assertIsObject(unwrappedDomain);
    expect(unwrappedDomain.name).toBe("example.com");
    expect(unwrappedDomain.dns).toBeDefined();
  });

  it("should add dns to domain object without dns in site constructs", async () => {
    const { setup } = await import("../src/components/setup-components.js");

    setup();

    const transformCallback = getCapturedTransformCallback();
    assertDefined(transformCallback);

    // Mock args with a domain object that has no dns
    const args: StaticSiteArgs = {
      path: "./site",
      domain: {
        name: "example.com",
      },
    };

    // Call the transform callback
    transformCallback(args, {}, "TestSite");

    // Verify dns was added to the domain object
    assertDefined(args.domain);
    assertIsObject(args.domain);

    // Unwrap the Output to check the actual value
    const unwrappedDomain = await unwrapOutput(args.domain);
    assertIsObject(unwrappedDomain);
    expect(unwrappedDomain.name).toBe("example.com");
    expect(unwrappedDomain.dns).toBeDefined();
  });

  it("should not add domain when explicitly set to undefined", async () => {
    const { setup } = await import("../src/components/setup-components.js");

    setup();

    const transformCallback = getCapturedTransformCallback();
    assertDefined(transformCallback);

    // Mock args with domain explicitly set to undefined
    const args = {
      path: "./site",
      domain: undefined,
    };

    // Call the transform callback
    transformCallback(args, {}, "TestSite");

    // Verify domain remains undefined (no defaults added)
    expect(args.domain).toBeUndefined();
  });

  it("should not add dns when domain.dns is explicitly set to undefined", async () => {
    const { setup } = await import("../src/components/setup-components.js");

    setup();

    const transformCallback = getCapturedTransformCallback();
    assertDefined(transformCallback);

    // Mock args with domain.dns explicitly set to undefined
    const args = {
      path: "./site",
      domain: {
        name: "example.com",
        dns: undefined,
      },
    };

    // Call the transform callback
    transformCallback(args, {}, "TestSite");

    // The domain gets wrapped in output().apply()
    assertDefined(args.domain);
    assertIsObject(args.domain);

    // Unwrap the Output to check the actual value
    const unwrappedDomain = await unwrapOutput(args.domain);
    assertIsObject(unwrappedDomain);
    expect(unwrappedDomain.name).toBe("example.com");
    // dns should remain undefined since it was explicitly set
    expect(unwrappedDomain.dns).toBeUndefined();
  });
});
