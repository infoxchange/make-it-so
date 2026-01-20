import { describe, it, expect } from "vitest";
describe("dns", () => {
  it("should create DNS adapter with default configuration", async () => {
    const { dns } = await import("../src/components/ix/dns.js");
    const dnsAdapter = dns();

    expect(dnsAdapter).toBeDefined();
    expect(dnsAdapter.provider).toBe("aws");
    expect(typeof dnsAdapter.createAlias).toBe("function");
    expect(typeof dnsAdapter.createRecord).toBe("function");
    expect(typeof dnsAdapter.createCaa).toBe("function");
  });

  it("should create DNS adapter with zone ID", async () => {
    const { dns } = await import("../src/components/ix/dns.js");
    const dnsAdapter = dns({ zone: "Z1234567890ABC" });

    expect(dnsAdapter).toBeDefined();
    expect(dnsAdapter.provider).toBe("aws");
  });

  it("should create DNS adapter with override flag", async () => {
    const { dns } = await import("../src/components/ix/dns.js");
    const dnsAdapter = dns({ override: true });

    expect(dnsAdapter).toBeDefined();
    expect(dnsAdapter.provider).toBe("aws");
  });

  it("should create DNS adapter with transform function", async () => {
    const { dns } = await import("../src/components/ix/dns.js");
    const transformFn = () => {
      // Transform function must return undefined according to Transform type
      // It modifies args in place
      return undefined;
    };
    const dnsAdapter = dns({
      transform: {
        record: transformFn,
      },
    });

    expect(dnsAdapter).toBeDefined();
    expect(dnsAdapter.provider).toBe("aws");
  });

  it("should create CAA placeholder that returns undefined", async () => {
    const { dns } = await import("../src/components/ix/dns.js");
    const dnsAdapter = dns();

    const caa = dnsAdapter.createCaa("test", "example.com", {});

    expect(caa).toBeUndefined();
  });

  it("should return functions for createAlias and createRecord", async () => {
    const { dns } = await import("../src/components/ix/dns.js");
    const dnsAdapter = dns();

    expect(typeof dnsAdapter.createAlias).toBe("function");
    expect(typeof dnsAdapter.createRecord).toBe("function");
    expect(typeof dnsAdapter.createCaa).toBe("function");
  });
});
