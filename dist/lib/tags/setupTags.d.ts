import { IConstruct } from "constructs";
export type ModifyTagsProps = {
    node: IConstruct;
    isLeafNode: boolean;
    isRootNode: boolean;
    currentTags: Array<{
        key: string;
        value: string;
    }>;
};
export type SetupTagsOptions = {
    modifyTags?: (props: ModifyTagsProps) => Array<{
        key: string;
        value: string;
    }>;
};
export declare function setupTags(scope: IConstruct, { modifyTags }?: SetupTagsOptions): void;
//# sourceMappingURL=setupTags.d.ts.map