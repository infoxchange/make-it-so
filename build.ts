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

// Plugin to rename 'aws' imports and variables to avoid conflicts
const renameAwsPlugin: esbuild.Plugin = {
  name: "rename-aws",
  setup(build) {
    build.onLoad({ filter: /\.ts$/ }, async (args) => {
      const fs = await import("fs/promises");
      let contents = await fs.readFile(args.path, "utf8");

      // Rename namespace imports: import * as aws from "@pulumi/aws"
      contents = contents.replace(
        /import\s+\*\s+as\s+aws\s+from\s+["']@pulumi\/aws["']/g,
        'import * as awsSdk from "@pulumi/aws"',
      );

      // Rename the usage of 'aws.' to 'awsSdk.'
      contents = contents.replace(/\baws\./g, "awsSdk.");

      return {
        contents,
        loader: "ts",
      };
    });
  },
};

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
  plugins: [renameAwsPlugin],
});

// Build declaration files
execSync("tsc --project tsconfig.build.json", { stdio: "inherit" });

console.log("Build complete!");
