data "aws_route_table" "report" {
  subnet_id = var.private_subnet_id
}

resource "aws_security_group" "report_endpoints" {
  name   = "${local.prefix}-report-endpoints"
  vpc_id = var.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "report_endpoints" {
  security_group_id            = aws_security_group.report_endpoints.id
  referenced_security_group_id = var.app_security_group
  ip_protocol                  = "tcp"
  from_port                    = 443
  to_port                      = 443
}

resource "aws_vpc_endpoint" "report_api" {
  for_each            = toset(["secretsmanager", "email"])
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.region}.${each.key}"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = [var.private_subnet_id]
  security_group_ids  = [aws_security_group.report_endpoints.id]
}

resource "aws_vpc_endpoint" "report_s3" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [data.aws_route_table.report.id]
}

resource "aws_sqs_queue" "report_dlq" {
  name                      = "${local.prefix}-report-scheduler-dlq"
  sqs_managed_sse_enabled   = true
  message_retention_seconds = 86400
}

resource "aws_iam_role" "scheduler" {
  name = "${local.prefix}-report-scheduler"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = { "aws:SourceAccount" = var.account_id }
        ArnEquals    = { "aws:SourceArn" = aws_scheduler_schedule_group.reports.arn }
      }
    }]
  })
}

resource "aws_iam_role_policy" "scheduler" {
  role = aws_iam_role.scheduler.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "lambda:InvokeFunction"
        Resource = aws_lambda_function.low_stock.arn
      },
      {
        Effect   = "Allow"
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.report_dlq.arn
      }
    ]
  })
}

resource "aws_scheduler_schedule_group" "reports" {
  name = "${local.prefix}-reports"
}

resource "aws_scheduler_schedule" "low_stock" {
  name                         = "${local.prefix}-low-stock"
  group_name                   = aws_scheduler_schedule_group.reports.name
  schedule_expression          = "cron(0 9 * * ? *)"
  schedule_expression_timezone = "Asia/Kolkata"
  state                        = var.schedule_enabled ? "ENABLED" : "DISABLED"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_lambda_function.low_stock.arn
    role_arn = aws_iam_role.scheduler.arn
    input    = jsonencode({ scheduledTime = "<aws.scheduler.scheduled-time>" })

    retry_policy {
      maximum_event_age_in_seconds = 900
      maximum_retry_attempts       = 1
    }

    dead_letter_config {
      arn = aws_sqs_queue.report_dlq.arn
    }
  }

  depends_on = [aws_iam_role_policy.scheduler]
}
