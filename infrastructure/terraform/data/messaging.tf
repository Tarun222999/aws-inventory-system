resource "aws_sqs_queue" "orders_dlq" {
  name                       = "order-platform-phase6-order-processing-dlq"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 345600
  max_message_size           = 1048576
  delay_seconds              = 0
  receive_wait_time_seconds  = 0
  sqs_managed_sse_enabled    = true

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_sqs_queue.orders_dlq
  id = "https://sqs.ap-south-1.amazonaws.com/992382645171/order-platform-phase6-order-processing-dlq"
}


resource "aws_sqs_queue" "orders" {
  name                       = "order-platform-phase6-order-processing"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400
  max_message_size           = 1048576
  delay_seconds              = 0
  receive_wait_time_seconds  = 20
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 3
  })

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_sqs_queue.orders
  id = "https://sqs.ap-south-1.amazonaws.com/992382645171/order-platform-phase6-order-processing"
}


resource "aws_sqs_queue_policy" "orders" {
  queue_url = aws_sqs_queue.orders.id

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "__default_policy_ID"
    Statement = [
      {
        Sid    = "__owner_statement"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::992382645171:root"
        }
        Action   = "SQS:*"
        Resource = aws_sqs_queue.orders.arn
      }
    ]
  })
}

import {
  to = aws_sqs_queue_policy.orders
  id = "https://sqs.ap-south-1.amazonaws.com/992382645171/order-platform-phase6-order-processing"
}

resource "aws_sqs_queue_policy" "orders_dlq" {
  queue_url = aws_sqs_queue.orders_dlq.id

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "__default_policy_ID"
    Statement = [
      {
        Sid    = "__owner_statement"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::992382645171:root"
        }
        Action   = "SQS:*"
        Resource = aws_sqs_queue.orders_dlq.arn
      }
    ]
  })
}

import {
  to = aws_sqs_queue_policy.orders_dlq
  id = "https://sqs.ap-south-1.amazonaws.com/992382645171/order-platform-phase6-order-processing-dlq"
}