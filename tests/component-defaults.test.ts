import { describe, it, expect, vi, beforeEach } from "vitest";

describe("setupComponentDefaults", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  it("should export setupComponentDefaults function", async () => {
    const module = await import("../src/lib/sst/component-defaults.js");

    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe("function");
  });

  it("should accept $transform and sst parameters", async () => {
    const setupComponentDefaults = (
      await import("../src/lib/sst/component-defaults.js")
    ).default;

    const mockTransform = vi.fn();
    const mockSst = {
      aws: {
        StaticSite: {},
        Nextjs: {},
      },
      cloudflare: {
        StaticSite: {},
      },
    };

    expect(() => {
      setupComponentDefaults({
        $transform: mockTransform,
        sst: mockSst,
      });
    }).not.toThrow();
  });

  it("should call $transform for each component type", async () => {
    const setupComponentDefaults = (
      await import("../src/lib/sst/component-defaults.js")
    ).default;

    const mockTransform = vi.fn();
    const mockSst = {
      aws: {
        StaticSite: {},
        Nextjs: {},
      },
      cloudflare: {
        StaticSite: {},
      },
    };

    setupComponentDefaults({
      $transform: mockTransform,
      sst: mockSst,
    });

    // Should be called once for each component type (StaticSite, Nextjs, Cloudflare.StaticSite)
    expect(mockTransform).toHaveBeenCalledTimes(3);
    expect(mockTransform).toHaveBeenCalledWith(
      mockSst.aws.StaticSite,
      expect.any(Function),
    );
    expect(mockTransform).toHaveBeenCalledWith(
      mockSst.aws.Nextjs,
      expect.any(Function),
    );
    expect(mockTransform).toHaveBeenCalledWith(
      mockSst.cloudflare.StaticSite,
      expect.any(Function),
    );
  });

  it("should have transform callbacks that handle args", async () => {
    const setupComponentDefaults = (
      await import("../src/lib/sst/component-defaults.js")
    ).default;

    let transformCallback: ((...args: never[]) => unknown) | undefined;
    const mockTransform = vi.fn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (component: any, callback: any) => {
        transformCallback = callback;
      },
    );

    const mockSst = {
      aws: {
        StaticSite: {},
        Nextjs: {},
      },
      cloudflare: {
        StaticSite: {},
      },
    };

    setupComponentDefaults({
      $transform: mockTransform,
      sst: mockSst,
    });

    // Test that the transform callback exists and can be called
    expect(transformCallback).toBeDefined();
    expect(typeof transformCallback).toBe("function");
  });

  it("should throw error when args is undefined", async () => {
    const setupComponentDefaults = (
      await import("../src/lib/sst/component-defaults.js")
    ).default;

    const mockTransform = vi.fn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (component: any, callback: any) => {
        expect(() => {
          callback(undefined, {}, "TestComponent");
        }).toThrow("No args provided");
      },
    );

    const mockSst = {
      aws: {
        StaticSite: {},
        Nextjs: {},
      },
      cloudflare: {
        StaticSite: {},
      },
    };

    setupComponentDefaults({
      $transform: mockTransform,
      sst: mockSst,
    });

    expect(mockTransform).toHaveBeenCalled();
  });
});
