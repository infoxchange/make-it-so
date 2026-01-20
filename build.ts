#!/usr/bin/env -S npx tsx

import * as esbuild from "esbuild";
import { readFileSync, rmSync } from "fs";
import { execSync } from "child_process";

interface PackageJson {
  peerDependencies?: Record<string, string>;
  dependencies?: Record<string, string>;
}

const packageJson: PackageJson = JSON.parse(
  readFileSync("./package.json", "utf-8"),
);

// Clean dist directory before building
rmSync("dist", { recursive: true, force: true });

// Get all dependencies that should be external (not bundled)
const external = [
  ...Object.keys(packageJson.peerDependencies || {}),
  ...Object.keys(packageJson.dependencies || {}).filter(
    (dep) => dep !== "sst3",
  ),
  "@infoxchange/make-it-so/*", // Self-references should be external
];

// Build ESM
await esbuild.build({
  entryPoints: ["src/components/ix/index.ts", "src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node21",
  external,
  sourcemap: true,
  format: "esm",
  outdir: "dist",
  outExtension: { ".js": ".js" },
  // Bundle sst3 code
  packages: "bundle",
  entryNames: "[dir]/[name]", // Preserve directory structure
});

// Build declaration files
execSync("tsc --project tsconfig.build.json", { stdio: "inherit" });

console.log("Build complete!");
