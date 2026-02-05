import CloudWatch from "aws-cdk-lib/aws-cloudwatch";
import CDK from "aws-cdk-lib";
import CdkCustomResources from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import CloudWatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import SNS from "aws-cdk-lib/aws-sns";
import Iam from "aws-cdk-lib/aws-iam";
import Lambda from "aws-cdk-lib/aws-lambda";
import { isCDKConstruct } from "sst/constructs/Construct.js";
import ixDeployConfig from "../deployConfig.js";
import type { PutMetricAlarmCommandInput } from "@aws-sdk/client-cloudwatch";

type AlarmActions = {
  onOk?: (string | CloudWatch.IAlarmAction)[];
  onAlarm?: (string | CloudWatch.IAlarmAction)[];
  onInsufficientData?: (string | CloudWatch.IAlarmAction)[];
};

type CloudWatchAlarmProps = Omit<
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
  actions?: AlarmActions;
};

type NormalizedCloudWatchAlarmProps = Omit<CloudWatch.AlarmProps, "metric"> & {
  metric: CloudWatch.MetricProps;
  actions?: AlarmActions;
};

export class IxCloudWatchAlarm extends Construct {
  constructor(scope: Construct, id: string, props: CloudWatchAlarmProps) {
    super(scope, id);

    const normalizedProps = {
      ...props,
      metric: {
        ...props.metric,
        period:
          typeof props.metric.period === "function"
            ? props.metric.period(CDK.Duration)
            : props.metric.period,
        statistic:
          typeof props.metric.statistic === "function"
            ? props.metric.statistic(CloudWatch.Stats)
            : props.metric.statistic,
      },
      treatMissingData:
        typeof props.treatMissingData === "function"
          ? props.treatMissingData(CloudWatch.TreatMissingData)
          : props.treatMissingData,
      comparisonOperator:
        typeof props.comparisonOperator === "function"
          ? props.comparisonOperator(CloudWatch.ComparisonOperator)
          : props.comparisonOperator,
      actions:
        "actions" in props
          ? props.actions
          : {
              ...(ixDeployConfig.alarmSnsTopic
                ? { onOk: [ixDeployConfig.alarmSnsTopic] }
                : {}),
              ...(ixDeployConfig.alarmSnsTopic
                ? { onAlarm: [ixDeployConfig.alarmSnsTopic] }
                : {}),
            },
    } satisfies NormalizedCloudWatchAlarmProps;

    if (props.metric.namespace === "AWS/CloudFront") {
      setupCloudFrontAlarm(this, id, normalizedProps);
      return;
    }

    // Create CloudWatch alarm for API Gateway latency
    const apiGatewayLatencyMetric = new CloudWatch.Metric(
      normalizedProps.metric,
    );

    const alarm = new CloudWatch.Alarm(scope, `${id}-CWAlarm`, {
      ...normalizedProps,
      metric: apiGatewayLatencyMetric,
    });

    for (let action of normalizedProps.actions?.onAlarm || []) {
      action = convertToActionObject(scope, id, "alarm", action);
      alarm.addAlarmAction(action);
    }
    for (let action of normalizedProps.actions?.onOk || []) {
      action = convertToActionObject(scope, id, "ok", action);
      alarm.addOkAction(action);
    }
    for (let action of normalizedProps.actions?.onInsufficientData || []) {
      action = convertToActionObject(scope, id, "insufficientData", action);
      alarm.addInsufficientDataAction(action);
    }
  }

  static Stats = CloudWatch.Stats;
  static Duration = CDK.Duration;
  static TreatMissingData = CloudWatch.TreatMissingData;
  static ComparisonOperator = CloudWatch.ComparisonOperator;
}

function convertToActionObject(
  scope: Construct,
  id: string,
  actionType: "alarm" | "ok" | "insufficientData",
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

type RequiredButAllowUndefined<T> = {
  [K in keyof Required<T>]: T[K];
};

/*
CloudWatch alarms for CloudFront must be created in the same region as the CloudFront distribution, which can only be
created in us-east-1. Therefore the CloudWatch alarm must also be created in us-east-1 but CloudFormation won't let us
directly create a resource in another region. To work around this, we use an AwsCustomResource to call the CloudWatch
API to create the alarm in us-east-1.
*/
function setupCloudFrontAlarm(
  scope: Construct,
  id: string,
  props: NormalizedCloudWatchAlarmProps,
) {
  const region = "us-east-1";
  const alarmName = props.alarmName;
  if (!alarmName) {
    throw new Error("Alarm name is required for CloudFront alarms");
  }

  // Convert IAlarmAction objects to ARN strings
  // Note: We create a forward reference to the alarm for binding purposes only.
  // This doesn't create the actual alarm - that happens via AwsCustomResource below.
  const convertActionToArn = (
    action: string | CloudWatch.IAlarmAction,
  ): string | undefined => {
    // Create a forward reference for binding actions
    const alarmRef = CloudWatch.Alarm.fromAlarmName(
      scope,
      `${id}-AlarmRef`,
      alarmName,
    );

    if (typeof action === "string") {
      return action;
    } else {
      const config = action.bind(scope, alarmRef);
      return config.alarmActionArn;
    }
  };

  let statistic, extendedStatistic;
  switch (props.metric.statistic) {
    case "Average":
    case "Maximum":
    case "Minimum":
    case "SampleCount":
    case "Sum":
      statistic = props.metric.statistic;
      break;
    default:
      extendedStatistic = props.metric.statistic;
  }

  // CloudWatch alarm actions must be in the same region as the alarm otherwise the API will return a region mismatch error
  // if you try. However it does not make it clear that the region mis-match is to do with a provided action. I wasted a
  // bunch of time on this so we add a check for that here in case it helps some other poor soul in future.
  const actionTypes = {
    onOk: "OK",
    onAlarm: "Alarm",
    onInsufficientData: "Insufficient data",
  };
  const resourceTypes = {
    sns: "SNS topic",
    lambda: "Lambda function",
  };
  for (const actionTypeProp of Object.keys(
    actionTypes,
  ) as (keyof typeof actionTypes)[]) {
    for (const action of props.actions?.[actionTypeProp] || []) {
      const arn = convertActionToArn(action);
      for (const resourceTypeKey of Object.keys(
        resourceTypes,
      ) as (keyof typeof resourceTypes)[]) {
        if (!arn) {
          throw new Error(
            `Empty ARN given for ${actionTypes[actionTypeProp]} action.`,
          );
        }
        if (
          arn.startsWith(`arn:aws:${resourceTypeKey}:`) &&
          !arn.startsWith(`arn:aws:${resourceTypeKey}:${region}:`)
        ) {
          throw new Error(
            `${resourceTypes[resourceTypeKey]} for ${actionTypes[actionTypeProp]} action must live in the same region as the alarm, ${region}.`,
          );
        }
      }
    }
  }

  function isString(value: string | undefined): value is string {
    return typeof value === "string";
  }

  // Define CloudWatch alarm creation parameters
  const alarmParams = {
    AlarmName: props.alarmName,
    AlarmDescription: props.alarmDescription,
    ActionsEnabled: props.actionsEnabled,
    OKActions: props.actions?.onOk
      ?.map((action) => convertActionToArn(action))
      .filter(isString),
    AlarmActions: props.actions?.onAlarm
      ?.map((action) => convertActionToArn(action))
      .filter(isString),
    InsufficientDataActions: props.actions?.onInsufficientData
      ?.map((action) => convertActionToArn(action))
      .filter(isString),
    MetricName: props.metric.metricName,
    Namespace: props.metric.namespace,
    Statistic: statistic,
    ExtendedStatistic: extendedStatistic,
    Dimensions: [
      ...Object.entries(props.metric.dimensionsMap || {}).map(
        ([Name, Value]) => ({ Name, Value }),
      ),
      { Name: "Region", Value: "Global" },
    ],
    Period: props.metric.period?.toSeconds(),
    Unit: props.metric.unit,
    EvaluationPeriods: props.evaluationPeriods,
    DatapointsToAlarm: props.datapointsToAlarm,
    Threshold: props.threshold,
    ComparisonOperator: props.comparisonOperator,
    TreatMissingData: props.treatMissingData,
    EvaluateLowSampleCountPercentile: props.evaluateLowSampleCountPercentile,
    Metrics: undefined,
    Tags: undefined,
    ThresholdMetricId: undefined,
    // We want to ensure that someone using this construct has access to all options provided by putMetricAlarm
    // which is why we make all props not optional here since we'll get an error if we're missing one
  } satisfies RequiredButAllowUndefined<PutMetricAlarmCommandInput>;

  const expectedAlarmArn = CDK.Stack.of(scope).formatArn({
    service: "cloudwatch",
    resource: "alarm",
    resourceName: props.alarmName,
    region: region,
    arnFormat: CDK.ArnFormat.COLON_RESOURCE_NAME,
  });

  // Custom resource to create / update / delete the CloudWatch alarm in us-east-1
  new CdkCustomResources.AwsCustomResource(scope, "CloudFrontAlarm", {
    onCreate: {
      service: "CloudWatch",
      action: "putMetricAlarm",
      region,
      parameters: alarmParams,
      physicalResourceId:
        CdkCustomResources.PhysicalResourceId.of(expectedAlarmArn),
    },
    onUpdate: {
      service: "CloudWatch",
      action: "putMetricAlarm",
      region,
      parameters: alarmParams,
      physicalResourceId:
        CdkCustomResources.PhysicalResourceId.of(expectedAlarmArn),
    },
    onDelete: {
      service: "CloudWatch",
      action: "deleteAlarms",
      region,
      parameters: { AlarmNames: [props.alarmName] },
    },
    policy: CdkCustomResources.AwsCustomResourcePolicy.fromStatements([
      new Iam.PolicyStatement({
        actions: ["cloudwatch:PutMetricAlarm", "cloudwatch:DeleteAlarms"],
        resources: ["*"],
      }),
    ]),
    timeout: CDK.Duration.minutes(2),
  });
}
