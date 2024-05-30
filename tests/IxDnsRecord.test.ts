import { test, expect } from "vitest";
import { Template } from "aws-cdk-lib/assertions";
import * as cdk from "aws-cdk-lib";
import { IxDnsRecord } from "../src/cdk-constructs";

test("create A record", () => {
  const stack = new cdk.Stack();
  new IxDnsRecord(stack, "IxVpcDetails", {
    type: "A",
    name: "example.com",
    value: "1.1.1.1",
  });
  const template = Template.fromStack(stack);

  expect(
    template.findResources("Custom::DNSRecordUpdaterLambda"),
  ).toMatchSnapshot();
});

test("create ALIAS record", () => {
  const stack = new cdk.Stack();
  new IxDnsRecord(stack, "IxVpcDetails", {
    type: "ALIAS",
    name: "example.com",
    ttl: 300,
    value: "1.1.1.1",
    aliasZoneId: "Z1234567890",
  });
  const template = Template.fromStack(stack);

  expect(
    template.findResources("Custom::DNSRecordUpdaterLambda"),
  ).toMatchSnapshot();
});
