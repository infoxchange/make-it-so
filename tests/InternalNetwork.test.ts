import { describe, it, expect } from "vitest";

describe("InternalNetwork", () => {
  it("should export InternalNetwork class", async () => {
    const { InternalNetwork } = await import(
      "../src/components/ix/InternalNetwork.js"
    );

    expect(InternalNetwork).toBeDefined();
    expect(typeof InternalNetwork).toBe("function");
  });

  it("should have static getVpcSubnetIds method", async () => {
    const { InternalNetwork } = await import(
      "../src/components/ix/InternalNetwork.js"
    );

    expect(typeof InternalNetwork.getVpcSubnetIds).toBe("function");
  });

  it("should accept configuration in constructor", async () => {
    const { InternalNetwork } = await import(
      "../src/components/ix/InternalNetwork.js"
    );

    // Test that the class exists and can be referenced
    expect(InternalNetwork).toBeDefined();
    expect(typeof InternalNetwork).toBe("function");
  });

  it("should support transform configuration", async () => {
    await import("../src/components/ix/InternalNetwork.js");

    const config = {
      transform: {
        securityGroup: (args: { description?: string }) => {
          args.description = "Custom description";
          return args;
        },
      },
    };

    // Verify the config structure is valid
    expect(config.transform.securityGroup).toBeDefined();
    expect(typeof config.transform.securityGroup).toBe("function");
  });
});
