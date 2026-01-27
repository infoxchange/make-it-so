import { execSync } from "child_process";

const gitCommit = getGitShortCommit();

export default {
  branches: [
    "main",
    {
      name: "sst-v2",
      range: "2.x.x",
    },
    {
      name: "internal-testing-*",
      prerelease: `\${name}-${gitCommit}`,
    },
  ],
  preset: "conventionalcommits",
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        releaseRules: [
          { breaking: true, release: "major" },
          { type: "feat", release: "minor" },
          { revert: true, release: "patch" },
          { type: "fix", release: "patch" },
          { type: "perf", release: "patch" },
          { type: "ci", release: "patch" },
          { type: "refactor", release: "patch" },
          { type: "chore", release: "patch" },
          { type: "wip", release: "patch" },
          { type: "docs", scope: "help-text", release: "patch" },
          { type: "test", release: false },
          { scope: "no-release", release: false },
        ],
      },
    ],
    "@semantic-release/release-notes-generator",
    "@semantic-release/npm",
    "@semantic-release/github",
  ],
};

function getGitShortCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch (error) {
    console.error("Failed to get git commit hash:", error);
    return "unknown";
  }
}
