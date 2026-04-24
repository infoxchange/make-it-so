import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadDeployConfigEnvVars } from "./helpers/test-utils";

describe("deployConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules and clear environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("IX Deploy Configuration", () => {
    it("should parse valid IX deployment environment variables", async () => {
      loadDeployConfigEnvVars({
        IX_SITE_DOMAINS: "test.example.com,test2.example.com",
        IX_SITE_DOMAIN_ALIASES: "alias.example.com",
      });

      const { getDeployConfig } = await import("../src/deployConfig.js");
      const config = getDeployConfig();

      expect(config.isIxDeploy).toBe(true);
      expect(config.appName).toBe("test-app");
      expect(config.environment).toBe("dev");
      expect(config.workloadGroup).toBe("ds");
      expect(config.primaryAwsRegion).toBe("ap-southeast-2");
      expect(config.siteDomains).toEqual([
        "test.example.com",
        "test2.example.com",
      ]);
      expect(config.siteDomainAliases).toEqual(["alias.example.com"]);
      expect(config.isInternalApp).toBe(true);
      expect(config.deploymentType).toBe("serverless");
      expect(config.sourceCommitRef).toBe("main");
      expect(config.sourceCommitHash).toBe("abc123");
      expect(config.deployTriggeredBy).toBe("deploy-123");
      expect(config.smtpHost).toBe("smtp.example.com");
      expect(config.smtpPort).toBe(587);
      expect(config.clamAVUrl).toBe("http://clamav.example.com");
      expect(config.vpcHttpProxy).toBe("http://proxy.example.com");
      expect(config.tags.project).toBe("test-project");
    });

    it("should parse all valid environment values (test, uat, prod)", async () => {
      const environments = ["test", "uat", "prod"] as const;

      for (const env of environments) {
        loadDeployConfigEnvVars({
          IX_ENVIRONMENT: env,
          IX_WORKLOAD_GROUP: "srs",
          IX_SITE_DOMAIN_ALIASES: "",
          IX_INTERNAL_APP: "false",
          IX_DEPLOYMENT_TYPE: "docker",
          SMTP_PORT: "25",
        });

        const { getDeployConfig } = await import("../src/deployConfig.js");
        const config = getDeployConfig();

        expect(config.isIxDeploy).toBe(true);
        expect(config.environment).toBe(env);
      }
    });

    it("should handle comma-separated domains with whitespace", async () => {
      loadDeployConfigEnvVars({
        IX_SITE_DOMAINS: " domain1.com , domain2.com,  domain3.com ",
        IX_SITE_DOMAIN_ALIASES: " alias1.com, alias2.com ",
      });

      const { getDeployConfig } = await import("../src/deployConfig.js");
      const config = getDeployConfig();

      expect(config.siteDomains).toEqual([
        "domain1.com",
        "domain2.com",
        "domain3.com",
      ]);
      expect(config.siteDomainAliases).toEqual(["alias1.com", "alias2.com"]);
    });

    it("should throw error for invalid environment", async () => {
      loadDeployConfigEnvVars({
        IX_ENVIRONMENT: "invalid-env",
      });

      const { getDeployConfig } = await import("../src/deployConfig.js");
      expect(() => getDeployConfig()).toThrow();
    });

    it("should throw error for invalid workload group", async () => {
      loadDeployConfigEnvVars({
        IX_WORKLOAD_GROUP: "invalid-group",
      });

      const { getDeployConfig } = await import("../src/deployConfig.js");
      expect(() => getDeployConfig()).toThrow();
    });

    it("should throw error for missing required fields in IX deploy", async () => {
      loadDeployConfigEnvVars({
        IX_APP_NAME: "", // Missing required field
      });

      const { getDeployConfig } = await import("../src/deployConfig.js");
      expect(() => getDeployConfig()).toThrow();
    });
  });

  describe("Non-IX Deploy Configuration", () => {
    it("should parse non-IX deployment configuration", async () => {
      loadDeployConfigEnvVars({
        IX_DEPLOYMENT: "false",
        IX_ENVIRONMENT: "local",
        IX_WORKLOAD_GROUP: "custom",
        IX_PRIMARY_AWS_REGION: "us-east-1",
        IX_SITE_DOMAINS: "localhost:3000",
        IX_SITE_DOMAIN_ALIASES: "",
        IX_DEPLOYMENT_TYPE: "local",
        IX_SOURCE_COMMIT_REF: "feature-branch",
        IX_SOURCE_COMMIT_HASH: "xyz789",
        IX_DEPLOY_TRIGGERED_BY: "manual",
        SMTP_HOST: "localhost",
        SMTP_PORT: "1025",
        CLAMAV_URL: "http://localhost:3310",
        VPC_HTTP_PROXY: "http://localhost:8080",
      });

      const { getDeployConfig } = await import("../src/deployConfig.js");
      const config = getDeployConfig();

      expect(config.isIxDeploy).toBe(false);
      expect(config.appName).toBe("test-app");
      expect(config.environment).toBe("local");
      expect(config.workloadGroup).toBe("custom");
      expect(config.primaryAwsRegion).toBe("us-east-1");
      expect(config.siteDomains).toEqual(["localhost:3000"]);
      expect(config.isInternalApp).toBe(true);
      expect(config.deploymentType).toBe("local");
    });

    it("should handle missing optional fields in non-IX deploy", async () => {
      loadDeployConfigEnvVars({
        IX_DEPLOYMENT: "false",
        IX_APP_NAME: "",
        IX_ENVIRONMENT: "",
        IX_INTERNAL_APP: "",
        SMTP_PORT: "",
      });

      const { getDeployConfig } = await import("../src/deployConfig.js");
      const config = getDeployConfig();

      expect(config.isIxDeploy).toBe(false);
      expect(config.appName).toBe("");
      expect(config.environment).toBe("");
      expect(config.isInternalApp).toBeUndefined();
      expect(config.smtpPort).toBeUndefined();
    });

    it("should handle invalid port number in non-IX deploy", async () => {
      loadDeployConfigEnvVars({
        IX_DEPLOYMENT: "false",
        SMTP_PORT: "not-a-number",
      });

      const { getDeployConfig } = await import("../src/deployConfig.js");
      const config = getDeployConfig();

      expect(config.isIxDeploy).toBe(false);
      expect(config.smtpPort).toBeUndefined();
    });
  });

  describe("getDeployConfig function", () => {
    it("should re-evaluate environment variables on each call", async () => {
      loadDeployConfigEnvVars({
        IX_DEPLOYMENT: "false",
        IX_APP_NAME: "first-app",
      });

      const { getDeployConfig } = await import("../src/deployConfig.js");
      const config1 = getDeployConfig();
      expect(config1.appName).toBe("first-app");

      // Change environment variable
      loadDeployConfigEnvVars({
        IX_DEPLOYMENT: "false",
        IX_APP_NAME: "second-app",
      });

      const config2 = getDeployConfig();
      expect(config2.appName).toBe("second-app");
    });
  });
});
