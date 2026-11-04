locals {
  alarm_metrics = {
    "orders-dlq" = {
      namespace  = "AWS/SQS"
      metric     = "ApproximateNumberOfMessagesVisible"
      dimensions = { QueueName = var.orders_dlq_name }
      stat       = "Maximum"
      threshold  = 1
    }
    "alb-5xx" = {
      namespace  = "AWS/ApplicationELB"
      metric     = "HTTPCode_Target_5XX_Count"
      dimensions = { LoadBalancer = var.load_balancer_suffix }
      stat       = "Sum"
      threshold  = 5
    }
  }
}

resource "aws_sns_topic_policy" "operations" {
  arn = aws_sns_topic.operations.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AccountOwner"
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${var.account_id}:root" }
        Action    = "sns:*"
        Resource  = aws_sns_topic.operations.arn
      },
      {
        Sid       = "CloudWatchAlarms"
        Effect    = "Allow"
        Principal = { Service = "cloudwatch.amazonaws.com" }
        Action    = "sns:Publish"
        Resource  = aws_sns_topic.operations.arn
        Condition = {
          StringEquals = { "aws:SourceAccount" = var.account_id }
          ArnEquals = {
            "aws:SourceArn" = [
              for name in keys(local.alarm_metrics) :
              "arn:aws:cloudwatch:${var.region}:${var.account_id}:alarm:${local.prefix}-${name}"
            ]
          }
        }
      }
    ]
  })
}

resource "aws_cloudwatch_metric_alarm" "operations" {
  for_each = local.alarm_metrics

  alarm_name          = "${local.prefix}-${each.key}"
  namespace           = each.value.namespace
  metric_name         = each.value.metric
  dimensions          = each.value.dimensions
  statistic           = each.value.stat
  period              = 60
  evaluation_periods  = 1
  threshold           = each.value.threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.operations.arn]

  depends_on = [aws_sns_topic_policy.operations]
}

resource "aws_cloudwatch_dashboard" "operations" {
  dashboard_name = "${local.prefix}-operations"
  dashboard_body = jsonencode({
    widgets = [
      for index, name in keys(local.alarm_metrics) : {
        type   = "metric"
        x      = index * 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = name
          region = var.region
          period = 60
          stat   = local.alarm_metrics[name].stat
          metrics = [concat(
            [local.alarm_metrics[name].namespace, local.alarm_metrics[name].metric],
            flatten([for key, value in local.alarm_metrics[name].dimensions : [key, value]])
          )]
        }
      }
    ]
  })
}
