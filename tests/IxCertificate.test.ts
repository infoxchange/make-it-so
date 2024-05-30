import { test, expect } from "vitest";

import { Template } from "aws-cdk-lib/assertions";
import * as cdk from "aws-cdk-lib";
import { IxCertificate } from "../src/cdk-constructs";

test("basic example - calls custom resource lambda with correct props", () => {
  const stack = new cdk.Stack();
  new IxCertificate(stack, "IxVpcDetails", {
    domainName: "example.com",
  });
  const template = Template.fromStack(stack);

  expect(template.findResources("Custom::CertIssuingLambda")).toMatchSnapshot();
});

test("full example - calls custom resource lambda with correct props", () => {
  const stack = new cdk.Stack();
  new IxCertificate(stack, "IxVpcDetails", {
    domainName: "example.com",
    subjectAlternativeNames: ["other-domain.com", "another-domain.com"],
    region: "us-west-2",
  });
  const template = Template.fromStack(stack);

  expect(template.findResources("Custom::CertIssuingLambda")).toMatchSnapshot();
});
