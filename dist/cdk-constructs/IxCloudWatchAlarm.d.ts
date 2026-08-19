import CloudWatch from "aws-cdk-lib/aws-cloudwatch";
import CDK from "aws-cdk-lib";
import { Construct } from "constructs";
type AlarmActions = {
    onOk?: (string | CloudWatch.IAlarmAction)[];
    onAlarm?: (string | CloudWatch.IAlarmAction)[];
    onInsufficientData?: (string | CloudWatch.IAlarmAction)[];
};
type CloudWatchAlarmProps = Omit<CloudWatch.AlarmProps, "metric" | "treatMissingData" | "comparisonOperator"> & {
    metric: Omit<CloudWatch.MetricProps, "period" | "statistic"> & {
        period?: CloudWatch.MetricProps["period"] | ((option: typeof CDK.Duration) => CDK.Duration);
        statistic?: CloudWatch.MetricProps["statistic"] | ((option: typeof CloudWatch.Stats) => string);
    };
    treatMissingData?: CloudWatch.AlarmProps["treatMissingData"] | ((option: typeof CloudWatch.TreatMissingData) => CloudWatch.TreatMissingData);
    comparisonOperator: CloudWatch.AlarmProps["comparisonOperator"] | ((option: typeof CloudWatch.ComparisonOperator) => CloudWatch.ComparisonOperator);
    actions?: AlarmActions;
    toNotify?: string[];
};
export declare class IxCloudWatchAlarm extends Construct {
    constructor(scope: Construct, id: string, props: CloudWatchAlarmProps);
    static Stats: typeof CloudWatch.Stats;
    static Duration: typeof CDK.Duration;
    static TreatMissingData: typeof CloudWatch.TreatMissingData;
    static ComparisonOperator: typeof CloudWatch.ComparisonOperator;
}
export {};
//# sourceMappingURL=IxCloudWatchAlarm.d.ts.map