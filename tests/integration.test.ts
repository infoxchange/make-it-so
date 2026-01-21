import { describe, it, expect } from "vitest";

describe("Package Exports", () => {
  it("should export deployConfig from main index", async () => {
    const exports = await import("../src/index.js");

    expect(exports.getDeployConfig).toBeDefined();
    expect(typeof exports.getDeployConfig).toBe("function");
  });

  it("should export setup from lib/sst", async () => {
    const exports = await import("../src/components/setup-components.js");

    expect(exports.setup).toBeDefined();
    expect(typeof exports.setup).toBe("function");
  });

  it("should export proxy fetch functions from main index", async () => {
    const exports = await import("../src/index.js");

    expect(exports.setupProxyGlobally).toBeDefined();
    expect(exports.getProxiedFetch).toBeDefined();
    expect(typeof exports.setupProxyGlobally).toBe("function");
    expect(typeof exports.getProxiedFetch).toBe("function");
  });

  it("should export IX components from components/ix", async () => {
    const exports = await import("../src/components/ix/index.js");

    expect(exports.dns).toBeDefined();
    expect(exports.InternalNetwork).toBeDefined();
    expect(typeof exports.dns).toBe("function");
    expect(typeof exports.InternalNetwork).toBe("function");
  });
});

describe("Library Integration", () => {
  it("should work with all exports together", async () => {
    // Import all main exports
    const mainExports = await import("../src/index.js");
    const ixExports = await import("../src/components/ix/index.js");

    // Check main exports are available
    expect(mainExports.getDeployConfig).toBeDefined();
    expect(mainExports.setupProxyGlobally).toBeDefined();
    expect(mainExports.getProxiedFetch).toBeDefined();

    // Check IX exports are available
    expect(ixExports.dns).toBeDefined();
    expect(ixExports.InternalNetwork).toBeDefined();

    // Verify functions can be called
    expect(() => mainExports.getDeployConfig()).not.toThrow();
    expect(() => mainExports.setupProxyGlobally()).not.toThrow();
    expect(() => mainExports.getProxiedFetch()).not.toThrow();
    expect(() => ixExports.dns()).not.toThrow();
  });

  it("should have correct TypeScript types available", async () => {
    // This is mainly a compile-time check, but we can verify runtime behavior
    const { dns } = await import("../src/components/ix/index.js");
    const dnsAdapter = dns();

    expect(dnsAdapter.provider).toBe("aws");
    expect(typeof dnsAdapter.createAlias).toBe("function");
    expect(typeof dnsAdapter.createRecord).toBe("function");
    expect(typeof dnsAdapter.createCaa).toBe("function");
  });
});
