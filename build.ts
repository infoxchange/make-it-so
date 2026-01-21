#!/usr/bin/env -S npx tsx

import * as esbuild from "esbuild";
import { readFileSync, rmSync } from "fs";
import { execSync } from "child_process";
import { renameAwsPlugin } from "./esbuild-plugin-rename-aws.js";

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
  // Self-references should be external
  "@infoxchange/make-it-so/*",
  "@infoxchange/make-it-so",
];

// Build ESM
await esbuild.build({
  // Code that gets compiled into one bundle should only import code that will be compiled into a different bundle via
  // the package name (e.g. "@infoxchange/make-it-so/components") rather than directly importing the source
  // (e.g. "./src/components/index.ts") to avoid esbuild including the imported code in both bundles. To allow these
  // package name imports to work even when the source hasn't been built (and thus the package exports point to
  // non-existent files) these imports also be reflected in tsconfig.json path aliases.
  entryPoints: ["src/components/index.ts", "src/index.ts"],
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
  plugins: [renameAwsPlugin],
});

// Build declaration files
execSync("tsc --project tsconfig.build.json", { stdio: "inherit" });

console.log("Build complete!");
