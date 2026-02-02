import CloudWatch from "aws-cdk-lib/aws-cloudwatch";
import CDK from "aws-cdk-lib";
import { Construct } from "constructs";
import CloudWatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import SNS from "aws-cdk-lib/aws-sns";
import Lambda from "aws-cdk-lib/aws-lambda";
import { isCDKConstruct } from "sst/constructs/Construct.js";
import ixDeployConfig from "../deployConfig.js";

type CloudFrontAlarmProps = Omit<
  CloudWatch.AlarmProps,
  "metric" | "treatMissingData" | "comparisonOperator"
> & {
  metric: Omit<CloudWatch.MetricProps, "period" | "statistic"> & {
    period?:
      | CloudWatch.MetricProps["period"]
      | ((option: typeof CDK.Duration) => CDK.Duration);
    statistic?:
      | CloudWatch.MetricProps["statistic"]
      | ((option: typeof CloudWatch.Stats) => string);
  };
  treatMissingData?:
    | CloudWatch.AlarmProps["treatMissingData"]
    | ((
        option: typeof CloudWatch.TreatMissingData,
      ) => CloudWatch.TreatMissingData);
  comparisonOperator:
    | CloudWatch.AlarmProps["comparisonOperator"]
    | ((
        option: typeof CloudWatch.ComparisonOperator,
      ) => CloudWatch.ComparisonOperator);
  actions?: {
    onOk?: (string | CloudWatch.IAlarmAction)[];
    onAlarm?: (string | CloudWatch.IAlarmAction)[];
  };
};

export class IxCloudWatchAlarm extends Construct {
  constructor(scope: Construct, id: string, props: CloudFrontAlarmProps) {
    super(scope, id);

    const {
      metric: metricProps,
      treatMissingData,
      actions = {
        ...(ixDeployConfig.alarmSnsTopic
          ? { onOk: [ixDeployConfig.alarmSnsTopic] }
          : {}),
        ...(ixDeployConfig.alarmSnsTopic
          ? { onAlarm: [ixDeployConfig.alarmSnsTopic] }
          : {}),
      },
      ...otherProps
    } = props;
    const { period, statistic, ...otherMetricProps } = metricProps;

    // Create CloudWatch alarm for API Gateway latency
    const apiGatewayLatencyMetric = new CloudWatch.Metric({
      ...otherMetricProps,
      period: typeof period === "function" ? period(CDK.Duration) : period,
      statistic:
        typeof statistic === "function"
          ? statistic(CloudWatch.Stats)
          : statistic,
    });

    const latencyAlarm = new CloudWatch.Alarm(scope, `${id}-CWAlarm`, {
      ...otherProps,
      metric: apiGatewayLatencyMetric,
      treatMissingData:
        typeof treatMissingData === "function"
          ? treatMissingData(CloudWatch.TreatMissingData)
          : treatMissingData,
      comparisonOperator:
        typeof props.comparisonOperator === "function"
          ? props.comparisonOperator(CloudWatch.ComparisonOperator)
          : props.comparisonOperator,
    });

    for (let action of actions.onAlarm || []) {
      action = convertToActionObject(scope, id, "alarm", action);
      latencyAlarm.addAlarmAction(action);
    }
    for (let action of actions.onOk || []) {
      action = convertToActionObject(scope, id, "ok", action);
      latencyAlarm.addOkAction(action);
    }
  }
}

function convertToActionObject(
  scope: Construct,
  id: string,
  actionType: "alarm" | "ok",
  action: string | CloudWatch.IAlarmAction,
): CloudWatch.IAlarmAction {
  if (typeof action === "string") {
    if (action.startsWith("arn:aws:lambda:")) {
      return new CloudWatchActions.LambdaAction(
        Lambda.Function.fromFunctionArn(
          scope,
          `${id}-${actionType}LambdaAction-${action}`,
          action,
        ),
      );
    } else if (action.startsWith("arn:aws:sns:")) {
      return new CloudWatchActions.SnsAction(
        SNS.Topic.fromTopicArn(
          scope,
          `${id}-${actionType}SNSAction-${action}`,
          action,
        ),
      );
    } else {
      throw new Error(`Unsupported action ARN: ${action}`);
    }
  } else if (isCDKConstruct(action)) {
    return action;
  } else {
    throw new Error(`Unsupported action type: ${typeof action}`);
  }
}
