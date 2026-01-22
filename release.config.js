import { execSync } from "child_process";

const gitCommit = getGitShortCommit();
const gitBranch = getGitBranch();

export default {
  branches: [
    "main",
    {
      name: "sst-v2",
      // This branch gets pushed to a different package to the main branch but a git tag is set on the same repo for
      // both so we need to disambiguate that to avoid tag name collisions.
      tagFormat: "v${version}-sst-v2",
    },
    {
      name: "internal-testing-*",
      // Including the git commit hash in release IDs avoids collisions when
      // rebasing a branch that has already had releases made from it.
      tagFormat: `v\${version}-${gitCommit}`,
      prerelease: `${normalizeForPrerelease(gitBranch)}-${gitCommit}`,
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

function getGitBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
    }).trim();
  } catch (error) {
    console.error("Failed to get git branch name:", error);
    return "unknown";
  }
}

function normalizeForPrerelease(str) {
  // Prerelease identifiers must comprise only ASCII alphanumerics and hyphens [0-9A-Za-z-]
  // Replace any invalid characters with hyphens, then remove leading/trailing hyphens
  return (
    str
      .replace(/[^0-9A-Za-z-]/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-") || // Collapse multiple consecutive hyphens
    "unknown"
  ); // Ensure we never return an empty string
}
