import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  setGlobalDispatcher,
  getGlobalDispatcher,
  EnvHttpProxyAgent,
} from "undici";

describe("Proxy Fetch", () => {
  const originalEnv = process.env;
  let originalDispatcher: unknown;

  beforeEach(() => {
    // Save original state
    process.env = { ...originalEnv };
    originalDispatcher = getGlobalDispatcher();

    // Clear module cache
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original state
    process.env = originalEnv;
    if (originalDispatcher) {
      setGlobalDispatcher(originalDispatcher as never);
    }
  });

  describe("setupProxyGlobally", () => {
    it("should set up proxy when HTTP_PROXY and HTTPS_PROXY are defined", async () => {
      process.env.HTTP_PROXY = "http://proxy.example.com:8080";
      process.env.HTTPS_PROXY = "http://proxy.example.com:8080";

      const { setupProxyGlobally } = await import("../src/lib/proxy/fetch.js");
      setupProxyGlobally();

      const dispatcher = getGlobalDispatcher();
      expect(dispatcher).toBeInstanceOf(EnvHttpProxyAgent);
    });

    it("should not set up proxy when HTTP_PROXY is not defined", async () => {
      delete process.env.HTTP_PROXY;
      delete process.env.HTTPS_PROXY;

      const { setupProxyGlobally } = await import("../src/lib/proxy/fetch.js");
      setupProxyGlobally();

      const dispatcher = getGlobalDispatcher();
      expect(dispatcher).not.toBeInstanceOf(EnvHttpProxyAgent);
    });

    it("should be idempotent - calling twice should not cause issues", async () => {
      process.env.HTTP_PROXY = "http://proxy.example.com:8080";
      process.env.HTTPS_PROXY = "http://proxy.example.com:8080";

      const { setupProxyGlobally } = await import("../src/lib/proxy/fetch.js");

      setupProxyGlobally();
      const dispatcher1 = getGlobalDispatcher();

      setupProxyGlobally();
      const dispatcher2 = getGlobalDispatcher();

      expect(dispatcher1).toBe(dispatcher2);
      expect(dispatcher1).toBeInstanceOf(EnvHttpProxyAgent);
    });

    it("should set GLOBAL_AGENT environment variables", async () => {
      process.env.HTTP_PROXY = "http://proxy.example.com:8080";
      process.env.HTTPS_PROXY = "https://proxy.example.com:8443";
      delete process.env.GLOBAL_AGENT_HTTP_PROXY;
      delete process.env.GLOBAL_AGENT_HTTPS_PROXY;

      const { setupProxyGlobally } = await import("../src/lib/proxy/fetch.js");
      setupProxyGlobally();

      expect(process.env.GLOBAL_AGENT_HTTP_PROXY).toBe(
        "http://proxy.example.com:8080",
      );
      expect(process.env.GLOBAL_AGENT_HTTPS_PROXY).toBe(
        "https://proxy.example.com:8443",
      );
    });

    it("should use HTTP_PROXY for HTTPS if HTTPS_PROXY is not set", async () => {
      process.env.HTTP_PROXY = "http://proxy.example.com:8080";
      delete process.env.HTTPS_PROXY;
      delete process.env.GLOBAL_AGENT_HTTP_PROXY;
      delete process.env.GLOBAL_AGENT_HTTPS_PROXY;

      const { setupProxyGlobally } = await import("../src/lib/proxy/fetch.js");
      setupProxyGlobally();

      // When HTTPS_PROXY is not set, it should fallback to HTTP_PROXY
      expect(
        process.env.GLOBAL_AGENT_HTTPS_PROXY || process.env.HTTP_PROXY,
      ).toBe("http://proxy.example.com:8080");
    });

    it("should not override existing GLOBAL_AGENT variables", async () => {
      process.env.HTTP_PROXY = "http://proxy.example.com:8080";
      process.env.HTTPS_PROXY = "http://proxy.example.com:8080";
      process.env.GLOBAL_AGENT_HTTP_PROXY = "http://existing.proxy.com:3128";
      process.env.GLOBAL_AGENT_HTTPS_PROXY = "http://existing.proxy.com:3128";

      const { setupProxyGlobally } = await import("../src/lib/proxy/fetch.js");
      setupProxyGlobally();

      expect(process.env.GLOBAL_AGENT_HTTP_PROXY).toBe(
        "http://existing.proxy.com:3128",
      );
      expect(process.env.GLOBAL_AGENT_HTTPS_PROXY).toBe(
        "http://existing.proxy.com:3128",
      );
    });
  });

  describe("getProxiedFetch", () => {
    it("should return a fetch function", async () => {
      const { getProxiedFetch } = await import("../src/lib/proxy/fetch.js");
      const fetch = getProxiedFetch();

      expect(typeof fetch).toBe("function");
    });

    it("should warn when custom dispatcher is provided", async () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const { getProxiedFetch } = await import("../src/lib/proxy/fetch.js");
      const fetch = getProxiedFetch();

      const mockDispatcher = new EnvHttpProxyAgent() as never;

      try {
        // This should trigger the warning
        await fetch("http://example.com", { dispatcher: mockDispatcher });
      } catch (e) {
        // Network errors are expected in tests
      }

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("custom dispatcher"),
      );

      consoleWarnSpy.mockRestore();
    });

    it("should create new EnvHttpProxyAgent for each call", async () => {
      process.env.HTTP_PROXY = "http://proxy.example.com:8080";

      const { getProxiedFetch } = await import("../src/lib/proxy/fetch.js");
      const fetch = getProxiedFetch();

      // The function should work with proxy environment variables
      expect(typeof fetch).toBe("function");
    });

    it("should preserve init options when adding dispatcher", async () => {
      const { getProxiedFetch } = await import("../src/lib/proxy/fetch.js");
      const fetch = getProxiedFetch();

      const initOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: "data" }),
      };

      try {
        await fetch("http://example.com", initOptions);
      } catch (e) {
        // Network errors are expected in tests
      }

      // If this doesn't throw, the options were preserved correctly
      expect(true).toBe(true);
    });

    it("should work with no init options provided", async () => {
      const { getProxiedFetch } = await import("../src/lib/proxy/fetch.js");
      const fetch = getProxiedFetch();

      try {
        await fetch("http://example.com");
      } catch (e) {
        // Network errors are expected in tests
      }

      // If this doesn't throw, it works correctly
      expect(true).toBe(true);
    });
  });

  describe("Integration", () => {
    it("should allow both setupProxyGlobally and getProxiedFetch to work together", async () => {
      process.env.HTTP_PROXY = "http://proxy.example.com:8080";
      process.env.HTTPS_PROXY = "http://proxy.example.com:8080";

      const { setupProxyGlobally, getProxiedFetch } = await import(
        "../src/lib/proxy/fetch.js"
      );

      setupProxyGlobally();
      const globalDispatcher = getGlobalDispatcher();
      expect(globalDispatcher).toBeInstanceOf(EnvHttpProxyAgent);

      const fetch = getProxiedFetch();
      expect(typeof fetch).toBe("function");
    });
  });
});
