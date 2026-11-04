locals {
  prefix = "order-platform-phase9"
}

resource "aws_sns_topic" "operations" {
  name = "${local.prefix}-operations"
}

resource "aws_sns_topic_subscription" "operations" {
  topic_arn = aws_sns_topic.operations.arn
  protocol  = "email"
  endpoint  = var.email
}

resource "aws_ses_email_identity" "test" {
  email = var.email
}

resource "aws_cloudwatch_event_rule" "order_confirmed" {
  name           = "${local.prefix}-order-confirmed"
  event_bus_name = var.event_bus_name

  event_pattern = jsonencode({
    source        = ["com.order-platform.orders"]
    "detail-type" = ["OrderConfirmed"]
    detail        = { schemaVersion = [1] }
  })
}

resource "aws_iam_role" "eventbridge" {
  name = "${local.prefix}-eventbridge-operations"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = { ArnEquals = { "aws:SourceArn" = aws_cloudwatch_event_rule.order_confirmed.arn } }
    }]
  })
}

resource "aws_iam_role_policy" "publish" {
  role = aws_iam_role.eventbridge.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sns:Publish"
      Resource = aws_sns_topic.operations.arn
    }]
  })
}

resource "aws_cloudwatch_event_target" "operations" {
  event_bus_name = var.event_bus_name
  rule           = aws_cloudwatch_event_rule.order_confirmed.name
  target_id      = "operations"
  arn            = aws_sns_topic.operations.arn
  role_arn       = aws_iam_role.eventbridge.arn

  input_transformer {
    input_paths    = { order_id = "$.detail.order.id" }
    input_template = "\"Order <order_id> is ready to ship.\""
  }

  depends_on = [aws_iam_role_policy.publish]
}

resource "aws_lambda_permission" "eventbridge" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.order_email.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.order_confirmed.arn
}

resource "aws_cloudwatch_event_target" "order_email" {
  event_bus_name = var.event_bus_name
  rule           = aws_cloudwatch_event_rule.order_confirmed.name
  target_id      = "order-email"
  arn            = aws_lambda_function.order_email.arn

  depends_on = [aws_lambda_permission.eventbridge, aws_lambda_function_event_invoke_config.order_email]
}
