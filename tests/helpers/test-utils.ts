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
