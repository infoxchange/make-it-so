import { Aspects, Stack } from "aws-cdk-lib";
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

    // Tags are inherited so applying them to the stack will apply them to all constructs in the stack. We can't apply
    // them to the app construct as there's a clash with a different SST internal aspect (CreateSsmParameters).
    if (node instanceof Stack) {
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

    if (!tags.length) {
      // We return undefined so avoid applying the Tags aspect if there are no tags to apply.
      return undefined;
    }
    return tags;
  });

  Aspects.of(scope).add(conditionalTags);
}
