/**
 * Mock utilities for SST globals
 * These globals are normally provided by SST when running sst.config.ts
 */

import { vi } from "vitest";

// Captured callback from $transform for testing
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- The type of the callback doesn't matter here since we're testing it's runtime behaviour
let capturedTransformCallback: ((...args: any[]) => void) | undefined;

/**
 * Creates a mock sst global object with all the component constructors
 */
export function createMockSst() {
  return {
    aws: {
      StaticSite: class {},
      Nextjs: class {},
      Nuxt: class {},
      Remix: class {},
      React: class {},
      TanStackStart: class {},
      Astro: class {},
      SvelteKit: class {},
      SolidStart: class {},
      Analog: class {},
    },
    cloudflare: {
      StaticSite: class {},
    },
  };
}

/**
 * Creates a mock for the $transform global function that captures callbacks
 * Returns a vitest spy that tracks calls
 */
export function createMockTransform() {
  return vi.fn(
    <T, Args, Options>(
      resource: { new (name: string, args: Args, opts?: Options): T },
      cb: (args: Args, opts: Options, name: string) => void,
    ) => {
      capturedTransformCallback = cb;
    },
  );
}

/**
 * Gets the callback that was captured by the most recent $transform call
 * Useful for testing what the transform callback does
 */
export function getCapturedTransformCallback() {
  return capturedTransformCallback;
}

/**
 * Sets up SST globals on globalThis for testing
 * Call this in test setup files to make SST globals available
 */
export function setupSstGlobals() {
  capturedTransformCallback = undefined;

  // @ts-expect-error - We're intentionally adding globals that TypeScript knows about from sst-globals.d.ts
  globalThis.sst = createMockSst();

  // @ts-expect-error - We're intentionally adding a global that TypeScript knows about from sst-globals.d.ts
  globalThis.$transform = createMockTransform();
}

/**
 * Cleans up SST globals from globalThis
 * Useful for test cleanup
 */
export function cleanupSstGlobals() {
  // @ts-expect-error - Removing globals
  delete globalThis.sst;
  // @ts-expect-error - Removing globals
  delete globalThis.$transform;
}
