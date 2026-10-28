/**
 * Strips the shared leading whitespace off every line of a template literal, so a multi-line string can be indented
 * to match the code it sits in without that indentation ending up in the output. Blank lines are emptied rather than
 * kept as whitespace, and leading/trailing blank lines are dropped.
 */
export declare function deindent(str: string): string;
//# sourceMappingURL=strings.d.ts.map