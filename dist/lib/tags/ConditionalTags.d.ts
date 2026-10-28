import { IAspect } from "aws-cdk-lib";
import { IConstruct } from "constructs";
export declare class ConditionalTags implements IAspect {
    private getTags;
    constructor(getTags: (node: IConstruct) => Array<{
        key: string;
        value: string;
    }> | undefined | null);
    visit(node: IConstruct): void;
}
//# sourceMappingURL=ConditionalTags.d.ts.map