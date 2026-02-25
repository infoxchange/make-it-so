import { Aspects } from "aws-cdk-lib";
import { IConstruct } from "constructs";
import { Function } from "sst/constructs";
import { ConditionalTags } from "./ConditionalTags.js";
import deployConfig from "../../deployConfig.js";

export type ModifyTagsProps = {
  node: IConstruct;
  isLeafNode: boolean;
  isRootNode: boolean;
  currentTags: Array<{ key: string; value: string }>;
};

export type SetupTagsOptions = {
  modifyTags?: (
    props: ModifyTagsProps,
  ) => Array<{ key: string; value: string }>;
};

export function setupTags(
  scope: IConstruct,
  { modifyTags }: SetupTagsOptions = {},
) {
  const conditionalTags = new ConditionalTags((node) => {
    let tags = [];
    const isLeafNode = node.node.children.length === 0;
    const isRootNode = node === scope;

    // Add tags from deploy config to all constructs
    if (isRootNode) {
      Object.entries(deployConfig.tags).forEach(([key, value]) => {
        tags.push({ key, value });
      });
    }

    // SST v2's live lambda feature means that the local machine that `sst dev` is run on may use AWS creds that were
    // setup for a lambda. This triggers a false positive in GuardDuty, so we suppress that finding for any lambda that
    // has live dev enabled.
    if (node instanceof Function && node._isLiveDevEnabled) {
      tags.push({ key: "guardduty-suppress", value: "true" });
    }

    tags = modifyTags
      ? modifyTags({
          node,
          isLeafNode,
          isRootNode,
          currentTags: tags,
        })
      : tags;
    return tags;
  });

  Aspects.of(scope).add(conditionalTags);
}
