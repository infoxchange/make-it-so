import { test, expect } from "vitest";

import { Template } from "aws-cdk-lib/assertions";
import * as cdk from "aws-cdk-lib";
import { IxQuicksightWorkspace } from "../src/cdk-constructs";

test("basic example - calls custom resource lambda with correct props", () => {
  const stack = new cdk.Stack();
  new IxQuicksightWorkspace(stack, "IxQuicksightWorkspace", {
    appName: "example-app",
  });
  const template = Template.fromStack(stack);

  expect(
    template.findResources("Custom::QuicksightWorkspace"),
  ).toMatchSnapshot();
});

test("multi-bucket example - calls custom resource lambda with correct props", () => {
  const stack = new cdk.Stack();
  new IxQuicksightWorkspace(stack, "IxQuicksightWorkspace", {
    appName: "example-app",
    dataBuckets: ["example-data-bucket-1", "example-data-bucket-2"],
  });
  const template = Template.fromStack(stack);

  expect(
    template.findResources("Custom::QuicksightWorkspace"),
  ).toMatchSnapshot();
});
