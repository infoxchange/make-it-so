import { describe, it, expect, beforeEach, afterEach } from "vitest";

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
      process.env.IX_DEPLOYMENT = "true";
      process.env.IX_APP_NAME = "test-app";
      process.env.IX_ENVIRONMENT = "dev";
      process.env.IX_WORKLOAD_GROUP = "ds";
      process.env.IX_PRIMARY_AWS_REGION = "ap-southeast-2";
      process.env.IX_SITE_DOMAINS = "test.example.com,test2.example.com";
      process.env.IX_SITE_DOMAIN_ALIASES = "alias.example.com";
      process.env.IX_INTERNAL_APP = "true";
      process.env.IX_DEPLOYMENT_TYPE = "serverless";
      process.env.IX_SOURCE_COMMIT_REF = "main";
      process.env.IX_SOURCE_COMMIT_HASH = "abc123";
      process.env.IX_DEPLOY_TRIGGERED_BY = "deploy-123";
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_PORT = "587";
      process.env.CLAMAV_URL = "http://clamav.example.com";
      process.env.VPC_HTTP_PROXY = "http://proxy.example.com";

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
    });

    it("should parse all valid environment values (test, uat, prod)", async () => {
      const environments = ["test", "uat", "prod"] as const;

      for (const env of environments) {
        process.env.IX_DEPLOYMENT = "true";
        process.env.IX_APP_NAME = "test-app";
        process.env.IX_ENVIRONMENT = env;
        process.env.IX_WORKLOAD_GROUP = "srs";
        process.env.IX_PRIMARY_AWS_REGION = "ap-southeast-2";
        process.env.IX_SITE_DOMAINS = "test.example.com";
        process.env.IX_SITE_DOMAIN_ALIASES = "";
        process.env.IX_INTERNAL_APP = "false";
        process.env.IX_DEPLOYMENT_TYPE = "docker";
        process.env.IX_SOURCE_COMMIT_REF = "main";
        process.env.IX_SOURCE_COMMIT_HASH = "abc123";
        process.env.IX_DEPLOY_TRIGGERED_BY = "deploy-123";
        process.env.SMTP_HOST = "smtp.example.com";
        process.env.SMTP_PORT = "25";
        process.env.CLAMAV_URL = "http://clamav.example.com";
        process.env.VPC_HTTP_PROXY = "http://proxy.example.com";

        const { getDeployConfig } = await import("../src/deployConfig.js");
        const config = getDeployConfig();

        expect(config.isIxDeploy).toBe(true);
        expect(config.environment).toBe(env);
      }
    });

    it("should handle comma-separated domains with whitespace", async () => {
      process.env.IX_DEPLOYMENT = "true";
      process.env.IX_APP_NAME = "test-app";
      process.env.IX_ENVIRONMENT = "dev";
      process.env.IX_WORKLOAD_GROUP = "ds";
      process.env.IX_PRIMARY_AWS_REGION = "ap-southeast-2";
      process.env.IX_SITE_DOMAINS = " domain1.com , domain2.com,  domain3.com ";
      process.env.IX_SITE_DOMAIN_ALIASES = " alias1.com, alias2.com ";
      process.env.IX_INTERNAL_APP = "true";
      process.env.IX_DEPLOYMENT_TYPE = "serverless";
      process.env.IX_SOURCE_COMMIT_REF = "main";
      process.env.IX_SOURCE_COMMIT_HASH = "abc123";
      process.env.IX_DEPLOY_TRIGGERED_BY = "deploy-123";
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_PORT = "587";
      process.env.CLAMAV_URL = "http://clamav.example.com";
      process.env.VPC_HTTP_PROXY = "http://proxy.example.com";

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
      process.env.IX_DEPLOYMENT = "true";
      process.env.IX_APP_NAME = "test-app";
      process.env.IX_ENVIRONMENT = "invalid-env";
      process.env.IX_WORKLOAD_GROUP = "ds";
      process.env.IX_PRIMARY_AWS_REGION = "ap-southeast-2";
      process.env.IX_SITE_DOMAINS = "test.example.com";
      process.env.IX_SITE_DOMAIN_ALIASES = "";
      process.env.IX_INTERNAL_APP = "true";
      process.env.IX_DEPLOYMENT_TYPE = "serverless";
      process.env.IX_SOURCE_COMMIT_REF = "main";
      process.env.IX_SOURCE_COMMIT_HASH = "abc123";
      process.env.IX_DEPLOY_TRIGGERED_BY = "deploy-123";
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_PORT = "587";
      process.env.CLAMAV_URL = "http://clamav.example.com";
      process.env.VPC_HTTP_PROXY = "http://proxy.example.com";

      const { getDeployConfig } = await import("../src/deployConfig.js");
      expect(() => getDeployConfig()).toThrow();
    });

    it("should throw error for invalid workload group", async () => {
      process.env.IX_DEPLOYMENT = "true";
      process.env.IX_APP_NAME = "test-app";
      process.env.IX_ENVIRONMENT = "dev";
      process.env.IX_WORKLOAD_GROUP = "invalid-group";
      process.env.IX_PRIMARY_AWS_REGION = "ap-southeast-2";
      process.env.IX_SITE_DOMAINS = "test.example.com";
      process.env.IX_SITE_DOMAIN_ALIASES = "";
      process.env.IX_INTERNAL_APP = "true";
      process.env.IX_DEPLOYMENT_TYPE = "serverless";
      process.env.IX_SOURCE_COMMIT_REF = "main";
      process.env.IX_SOURCE_COMMIT_HASH = "abc123";
      process.env.IX_DEPLOY_TRIGGERED_BY = "deploy-123";
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_PORT = "587";
      process.env.CLAMAV_URL = "http://clamav.example.com";
      process.env.VPC_HTTP_PROXY = "http://proxy.example.com";

      const { getDeployConfig } = await import("../src/deployConfig.js");
      expect(() => getDeployConfig()).toThrow();
    });

    it("should throw error for missing required fields in IX deploy", async () => {
      process.env.IX_DEPLOYMENT = "true";
      process.env.IX_APP_NAME = ""; // Missing required field

      const { getDeployConfig } = await import("../src/deployConfig.js");
      expect(() => getDeployConfig()).toThrow();
    });
  });

  describe("Non-IX Deploy Configuration", () => {
    it("should parse non-IX deployment configuration", async () => {
      process.env.IX_DEPLOYMENT = "false";
      process.env.IX_APP_NAME = "test-app";
      process.env.IX_ENVIRONMENT = "local";
      process.env.IX_WORKLOAD_GROUP = "custom";
      process.env.IX_PRIMARY_AWS_REGION = "us-east-1";
      process.env.IX_SITE_DOMAINS = "localhost:3000";
      process.env.IX_SITE_DOMAIN_ALIASES = "";
      process.env.IX_INTERNAL_APP = "true";
      process.env.IX_DEPLOYMENT_TYPE = "local";
      process.env.IX_SOURCE_COMMIT_REF = "feature-branch";
      process.env.IX_SOURCE_COMMIT_HASH = "xyz789";
      process.env.IX_DEPLOY_TRIGGERED_BY = "manual";
      process.env.SMTP_HOST = "localhost";
      process.env.SMTP_PORT = "1025";
      process.env.CLAMAV_URL = "http://localhost:3310";
      process.env.VPC_HTTP_PROXY = "http://localhost:8080";

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
      process.env.IX_DEPLOYMENT = "false";

      const { getDeployConfig } = await import("../src/deployConfig.js");
      const config = getDeployConfig();

      expect(config.isIxDeploy).toBe(false);
      expect(config.appName).toBe("");
      expect(config.environment).toBe("");
      expect(config.isInternalApp).toBeUndefined();
      expect(config.smtpPort).toBeUndefined();
    });

    it("should handle invalid port number in non-IX deploy", async () => {
      process.env.IX_DEPLOYMENT = "false";
      process.env.SMTP_PORT = "not-a-number";

      const { getDeployConfig } = await import("../src/deployConfig.js");
      const config = getDeployConfig();

      expect(config.isIxDeploy).toBe(false);
      expect(config.smtpPort).toBeUndefined();
    });
  });

  describe("getDeployConfig function", () => {
    it("should re-evaluate environment variables on each call", async () => {
      process.env.IX_DEPLOYMENT = "false";
      process.env.IX_APP_NAME = "first-app";

      const { getDeployConfig } = await import("../src/deployConfig.js");
      const config1 = getDeployConfig();
      expect(config1.appName).toBe("first-app");

      // Change environment variable
      process.env.IX_APP_NAME = "second-app";
      const config2 = getDeployConfig();
      expect(config2.appName).toBe("second-app");
    });
  });
});
