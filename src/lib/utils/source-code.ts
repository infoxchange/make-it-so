import ts from "typescript";
import fs from "fs";

export function getFileContentsWithoutTypes(filePath: string): string {
  const source = fs.readFileSync(filePath, "utf8");

  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  });
  return result.outputText;
}
