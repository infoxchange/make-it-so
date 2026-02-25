import { IAspect, Tags } from "aws-cdk-lib";
import { IConstruct } from "constructs";

export class ConditionalTags implements IAspect {
  constructor(
    private getTags: (
      node: IConstruct,
    ) => Array<{ key: string; value: string }> | undefined | null,
  ) {}

  visit(node: IConstruct) {
    this.getTags(node)?.forEach(({ key, value }) => {
      Tags.of(node).add(key, value);
    });
  }
}
