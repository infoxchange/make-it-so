import { Aspects, IAspect, Tag } from "aws-cdk-lib";
import { IConstruct } from "constructs";

export class ConditionalTags implements IAspect {
  constructor(
    private getTags: (
      node: IConstruct,
    ) => Array<{ key: string; value: string }> | undefined | null,
  ) {}

  visit(node: IConstruct) {
    this.getTags(node)?.forEach(({ key, value }) => {
      // We need to use a priority greater than 500 avoid a conflict that occurs with some aspects created by SST.
      // Since cdk's Tags aspect doesn't let us set a priority we have to use the slightly lower level Tag aspect here.
      Aspects.of(node).add(new Tag(key, value), { priority: 600 });
    });
  }
}
