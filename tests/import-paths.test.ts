import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

describe("Import paths", () => {
  // Read allowed import paths from package.json exports
  function getAllowedImportPaths(): string[] {
    const packageJsonPath = join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    const packageName = packageJson.name;
    const exports = packageJson.exports || {};

    const paths: string[] = [];
    for (const exportPath of Object.keys(exports)) {
      if (exportPath === ".") {
        paths.push(packageName);
      } else {
        // Remove leading "./" from export path
        const normalizedPath = exportPath.replace(/^\.\//, "");
        paths.push(`${packageName}/${normalizedPath}`);
      }
    }

    return paths;
  }

  const allowedImportPaths = getAllowedImportPaths();

  function getAllTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...getAllTypeScriptFiles(fullPath));
      } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
        files.push(fullPath);
      }
    }

    return files;
  }

  function extractImports(content: string): string[] {
    const importRegex =
      /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?["']([^"']+)["']/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  it("should only use allowed self-import paths", () => {
    const srcDir = join(process.cwd(), "src");
    const files = getAllTypeScriptFiles(srcDir);
    const violations: Array<{ file: string; import: string }> = [];

    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      const imports = extractImports(content);

      for (const importPath of imports) {
        // Check if it's a self-import
        if (importPath.startsWith("@infoxchange/make-it-so")) {
          // Check if it's one of the allowed paths
          if (!allowedImportPaths.includes(importPath)) {
            violations.push({
              file: file.replace(process.cwd() + "/", ""),
              import: importPath,
            });
          }
        }
      }
    }

    if (violations.length > 0) {
      const violationMessages = violations.map(
        (v) => `  ${v.file}: import from "${v.import}"`,
      );
      expect.fail(
        `Found invalid self-import paths. Only these paths are allowed:\n` +
          `  ${allowedImportPaths.join("\n  ")}\n\n` +
          `Violations found:\n${violationMessages.join("\n")}`,
      );
    }

    expect(violations).toHaveLength(0);
  });
});
