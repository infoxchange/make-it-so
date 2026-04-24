/**
 * esbuild plugin to rename 'aws' namespace imports to 'awsSdk'
 *
 * This prevents naming conflicts with the global 'aws' variable that SST creates
 * when interpreting the sst.config.ts file. SST injects a global 'aws' object
 * that provides access to AWS components, which can conflict with code that
 * imports "@pulumi/aws" as "aws".
 *
 * This plugin uses TypeScript's AST to:
 * - Rename: import * as aws from "@pulumi/aws" → import * as awsSdk from "@pulumi/aws"
 * - Rename: aws.something → awsSdk.something
 */

import * as esbuild from "esbuild";
import ts from "typescript";

export const renameAwsPlugin: esbuild.Plugin = {
  name: "rename-aws",
  setup(build) {
    build.onLoad({ filter: /\.ts$/ }, async (args) => {
      const fs = await import("fs/promises");
      const contents = await fs.readFile(args.path, "utf8");

      // Parse the TypeScript file
      const sourceFile = ts.createSourceFile(
        args.path,
        contents,
        ts.ScriptTarget.Latest,
        true,
      );

      // Transformer to rename 'aws' imports
      const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
        return (sourceFile) => {
          const visitor = (node: ts.Node): ts.Node => {
            // Rename import: import * as aws from "@pulumi/aws"
            if (
              ts.isImportDeclaration(node) &&
              node.moduleSpecifier &&
              ts.isStringLiteral(node.moduleSpecifier) &&
              node.moduleSpecifier.text === "@pulumi/aws"
            ) {
              if (
                node.importClause?.namedBindings &&
                ts.isNamespaceImport(node.importClause.namedBindings) &&
                node.importClause.namedBindings.name.text === "aws"
              ) {
                return ts.factory.updateImportDeclaration(
                  node,
                  node.modifiers,
                  ts.factory.updateImportClause(
                    node.importClause,
                    node.importClause.isTypeOnly,
                    node.importClause.name,
                    ts.factory.updateNamespaceImport(
                      node.importClause.namedBindings,
                      ts.factory.createIdentifier("awsSdk"),
                    ),
                  ),
                  node.moduleSpecifier,
                  node.attributes,
                );
              }
            }

            // Rename property access: aws.something -> awsSdk.something
            if (
              ts.isPropertyAccessExpression(node) &&
              ts.isIdentifier(node.expression) &&
              node.expression.text === "aws"
            ) {
              return ts.factory.updatePropertyAccessExpression(
                node,
                ts.factory.createIdentifier("awsSdk"),
                node.name,
              );
            }

            return ts.visitEachChild(node, visitor, context);
          };

          return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
        };
      };

      // Apply the transformation
      const result = ts.transform(sourceFile, [transformer]);
      const transformedSourceFile = result.transformed[0];

      // Print the transformed AST back to code
      const printer = ts.createPrinter();
      const transformedCode = printer.printFile(transformedSourceFile);

      result.dispose();

      return {
        contents: transformedCode,
        loader: "ts",
      };
    });
  },
};
