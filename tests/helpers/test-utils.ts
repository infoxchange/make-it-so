import { expect } from "vitest";
import * as pulumi from "@pulumi/pulumi";

/**
 * Type assertion helper that narrows out null and undefined values
 */
export function assertDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

/**
 * Type assertion helper that narrows to object type
 */
export function assertIsObject(value: unknown): asserts value is object {
  expect(typeof value).toBe("object");
  expect(value).not.toBeNull();
}

/**
 * Helper to unwrap Pulumi Output values for testing
 */
export async function unwrapOutput<T>(
  value: pulumi.Input<T>,
): Promise<pulumi.Unwrap<T>> {
  return new Promise((resolve) => {
    pulumi.output(value).apply((v) => {
      resolve(v);
      return v;
    });
  });
}

/**
 * Default environment variables for deploy config tests
 */
const DEFAULT_DEPLOY_CONFIG_ENV_VARS = {
  IX_DEPLOYMENT: "true",
  IX_APP_NAME: "test-app",
  IX_ENVIRONMENT: "dev",
  IX_WORKLOAD_GROUP: "ds",
  IX_PRIMARY_AWS_REGION: "ap-southeast-2",
  IX_SITE_DOMAINS: "test.example.com",
  IX_SITE_DOMAIN_ALIASES: "",
  IX_INTERNAL_APP: "true",
  IX_DEPLOYMENT_TYPE: "serverless",
  IX_SOURCE_COMMIT_REF: "main",
  IX_SOURCE_COMMIT_HASH: "abc123",
  IX_DEPLOY_TRIGGERED_BY: "deploy-123",
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  CLAMAV_URL: "http://clamav.example.com",
  VPC_HTTP_PROXY: "http://proxy.example.com",
  IX_ALARM_SNS_TOPIC: "arn:aws:sns:ap-southeast-2:123456789012:alarm-topic",
  IX_TAGS: JSON.stringify({
    project: "test-project",
    owner: "test-owner",
  }),
};

/**
 * Load environment variables for deploy config tests with optional overrides
 * @param overrides - Optional object with key-value pairs to override defaults
 */
export function loadDeployConfigEnvVars(
  overrides?: Record<string, string>,
): void {
  const envVars = {
    ...DEFAULT_DEPLOY_CONFIG_ENV_VARS,
    ...overrides,
  };

  Object.entries(envVars).forEach(([key, value]) => {
    process.env[key] = value;
  });
}
