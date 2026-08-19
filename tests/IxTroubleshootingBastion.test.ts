import { test, expect, beforeEach, afterEach } from "vitest";
import { Template } from "aws-cdk-lib/assertions";
import * as cdk from "aws-cdk-lib";
import { IxTroubleshootingBastion } from "../src/cdk-constructs";

// The construct only ever attaches to the IX VPC, which is looked up from SSM parameters, so these tests all run as
// though they were an IX deployment.
beforeEach(() => {
  process.env.IX_DEPLOYMENT = "true";
  process.env.IX_APP_NAME = "example-app";
  process.env.IX_ENVIRONMENT = "dev";
  process.env.IX_WORKLOAD_GROUP = "ds";
  process.env.VPC_HTTP_PROXY = "http://proxy.example.com:3128";
});

afterEach(() => {
  delete process.env.IX_DEPLOYMENT;
  delete process.env.IX_APP_NAME;
  delete process.env.IX_ENVIRONMENT;
  delete process.env.IX_WORKLOAD_GROUP;
  delete process.env.VPC_HTTP_PROXY;
  delete process.env.CI;
});

test("basic example - creates a key pair and an instance that uses it", () => {
  const stack = new cdk.Stack(undefined, "example-stack");
  new IxTroubleshootingBastion(stack, "TroubleshootingBastion");
  const template = Template.fromStack(stack);

  expect(template.findResources("AWS::EC2::KeyPair")).toMatchSnapshot();
  expect(template.findResources("AWS::EC2::Instance")).toMatchSnapshot();
});

test("defaults to allowing ssh from anywhere", () => {
  const stack = new cdk.Stack(undefined, "example-stack");
  new IxTroubleshootingBastion(stack, "TroubleshootingBastion");
  const template = Template.fromStack(stack);

  expect(
    Object.values(template.findResources("AWS::EC2::SecurityGroup"))[0]
      .Properties.SecurityGroupIngress,
  ).toEqual([
    {
      CidrIp: "0.0.0.0/0",
      Description: "Allow SSH to the troubleshooting bastion from 0.0.0.0/0",
      FromPort: 22,
      IpProtocol: "tcp",
      ToPort: 22,
    },
  ]);
});

test("full example - restricted ingress and extra packages", () => {
  const stack = new cdk.Stack(undefined, "example-stack");
  new IxTroubleshootingBastion(stack, "TroubleshootingBastion", {
    allowSshFrom: ["10.1.2.0/24", "10.9.9.0/24"],
    packages: ["postgresql16"],
  });
  const template = Template.fromStack(stack);

  expect(template.findResources("AWS::EC2::SecurityGroup")).toMatchSnapshot();
  expect(template.findResources("AWS::EC2::Instance")).toMatchSnapshot();
});

test("no user data commands are added when no packages are requested", () => {
  const stack = new cdk.Stack(undefined, "example-stack");
  new IxTroubleshootingBastion(stack, "TroubleshootingBastion");
  const template = Template.fromStack(stack);

  // The bare shebang is what CDK's Instance always emits; anything after it would be ours.
  expect(
    Object.values(template.findResources("AWS::EC2::Instance"))[0].Properties
      .UserData,
  ).toEqual({ "Fn::Base64": "#!/bin/bash" });
});

test("connection instructions are only output on CI", () => {
  const stack = new cdk.Stack(undefined, "example-stack");
  new IxTroubleshootingBastion(stack, "TroubleshootingBastion");

  expect(Template.fromStack(stack).toJSON().Outputs).not.toHaveProperty(
    "TroubleshootingBastionTroubleshootingBastionNote",
  );

  process.env.CI = "true";
  const ciStack = new cdk.Stack(undefined, "example-stack");
  new IxTroubleshootingBastion(ciStack, "TroubleshootingBastion");

  expect(
    JSON.stringify(Template.fromStack(ciStack).toJSON().Outputs),
  ).toContain("::warning title=Troubleshooting Bastion::");
});
