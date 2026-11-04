locals {
  functions = {
    order_email = {
      suffix  = "order-email"
      handler = "order-confirmation-lambda.handler"
    }
    low_stock = {
      suffix  = "low-stock-report"
      handler = "low-stock-report-lambda.handler"
    }
  }
  send_email = {
    Effect   = "Allow"
    Action   = "ses:SendEmail"
    Resource = aws_ses_email_identity.test.arn
    Condition = {
      StringEquals                = { "ses:FromAddress" = var.email }
      "ForAllValues:StringEquals" = { "ses:Recipients" = [var.email] }
    }
  }
}

resource "aws_cloudwatch_log_group" "lambda" {
  for_each          = local.functions
  name              = "/aws/lambda/${local.prefix}-${each.value.suffix}"
  retention_in_days = 1
}

resource "aws_iam_role" "lambda" {
  for_each = local.functions
  name     = "${local.prefix}-${each.value.suffix}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "lambda" {
  for_each = local.functions
  role     = aws_iam_role.lambda[each.key].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      local.send_email,
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.lambda[each.key].arn}:*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "report" {
  role = aws_iam_role.lambda["low_stock"].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface", "ec2:DescribeNetworkInterfaces",
          "ec2:DescribeSubnets", "ec2:DeleteNetworkInterface",
          "ec2:AssignPrivateIpAddresses", "ec2:UnassignPrivateIpAddresses"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = "secretsmanager:GetSecretValue"
        Resource = var.db_secret_arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = "${var.report_bucket_arn}/reports/low-stock/*"
      }
    ]
  })
}

resource "aws_lambda_function" "order_email" {
  function_name    = "${local.prefix}-order-email"
  role             = aws_iam_role.lambda["order_email"].arn
  runtime          = "nodejs22.x"
  handler          = local.functions.order_email.handler
  filename         = var.lambda_zip
  source_code_hash = filebase64sha256(var.lambda_zip)
  timeout          = 20

  environment {
    variables = { ORDER_EMAIL_TEST_INBOX = var.email }
  }

  depends_on = [aws_iam_role_policy.lambda]
}

resource "aws_lambda_function" "low_stock" {
  function_name    = "${local.prefix}-low-stock-report"
  role             = aws_iam_role.lambda["low_stock"].arn
  runtime          = "nodejs22.x"
  handler          = local.functions.low_stock.handler
  filename         = var.lambda_zip
  source_code_hash = filebase64sha256(var.lambda_zip)
  timeout          = 30
  memory_size      = 256

  vpc_config {
    subnet_ids         = [var.private_subnet_id]
    security_group_ids = [var.app_security_group]
  }

  environment {
    variables = {
      DB_HOST                     = var.db_host
      DB_PORT                     = tostring(var.db_port)
      DB_NAME                     = var.db_name
      DB_SECRET_ID                = var.db_secret_arn
      DATABASE_SSL_CA_PATH        = "/var/task/global-bundle.pem"
      LOW_STOCK_REPORT_BUCKET     = var.report_bucket_name
      LOW_STOCK_REPORT_FROM_EMAIL = var.email
      LOW_STOCK_REPORT_TO_EMAIL   = var.email
    }
  }

  depends_on = [aws_iam_role_policy.lambda, aws_iam_role_policy.report, aws_vpc_endpoint.report_api, aws_vpc_endpoint.report_s3]
}

resource "aws_lambda_function_event_invoke_config" "order_email" {
  function_name          = aws_lambda_function.order_email.function_name
  maximum_retry_attempts = 0
}
