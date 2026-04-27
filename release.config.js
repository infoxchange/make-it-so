export default {
  branches: [
    "main",
    {
      name: "sst-v2",
      range: "2.x.x",
    },
    // There are occasionally times where you need to verify the CI release process. To avoid creating real releases
    // while still doing a fairly representative test any deployments of this branch will publish a "prerelease" version
    {
      name: "ci-publish-test",
      // Adding a timestamp to the prerelease tags avoids conflicts on rebases where the version
      // might otherwise be the same as a previously published prerelease version
      prerelease: `\${name}-${Date.now()}`,
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
