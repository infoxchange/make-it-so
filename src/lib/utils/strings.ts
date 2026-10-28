/**
 * Strips the shared leading whitespace off every line of a template literal, so a multi-line string can be indented
 * to match the code it sits in without that indentation ending up in the output. Blank lines are emptied rather than
 * kept as whitespace, and leading/trailing blank lines are dropped.
 */
export function deindent(str: string): string {
  const lines = str.split("\n");
  const minIndent = lines
    .filter((line) => line.trim().length > 0)
    .reduce((min, line) => {
      const indent = line.match(/^\s*/)?.[0].length ?? 0;
      return Math.min(min, indent);
    }, Infinity);

  return lines
    .map((line) => (line.trim().length === 0 ? "" : line.slice(minIndent)))
    .join("\n")
    .trim();
}
