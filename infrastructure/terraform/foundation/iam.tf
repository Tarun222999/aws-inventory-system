resource "aws_iam_role" "execution" {
  name                 = "order-platform-phase4-execution-role"
  description          = "Allows ECS tasks to call AWS services on your behalf."
  path                 = "/"
  max_session_duration = 3600

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = ""
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "order-platform-phase4-execution-role"
  }

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_iam_role.execution
  id = "order-platform-phase4-execution-role"
}


resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

import {
  to = aws_iam_role_policy_attachment.execution
  id = "order-platform-phase4-execution-role/arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}


resource "aws_iam_role" "task" {
  name                 = "order-platform-phase4-task-role"
  description          = "Allows ECS tasks to call AWS services on your behalf."
  path                 = "/"
  max_session_duration = 3600

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = ""
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "order-platform-phase4-task-role"
  }

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_iam_role.task
  id = "order-platform-phase4-task-role"
}


resource "aws_iam_role_policy" "product_images" {
  name = "order-platform-phase5-product-images"
  role = aws_iam_role.task.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ProductImageObjectAccess"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "arn:aws:s3:::order-platform-phase5-product-images-2bf589a4/products/*"
      }
    ]
  })
}

import {
  to = aws_iam_role_policy.product_images
  id = "order-platform-phase4-task-role:order-platform-phase5-product-images"
}


resource "aws_iam_role_policy" "read_db_secret" {
  name = "order-platform-phase5-read-db-secret"
  role = aws_iam_role.task.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadPhase5DatabaseSecret"
        Effect   = "Allow"
        Action   = "secretsmanager:GetSecretValue"
        Resource = "arn:aws:secretsmanager:ap-south-1:992382645171:secret:rds!db-dbcfa47e-31e9-4993-be0e-bccfa336f8f9-twdiAT"
      }
    ]
  })
}

import {
  to = aws_iam_role_policy.read_db_secret
  id = "order-platform-phase4-task-role:order-platform-phase5-read-db-secret"
}



resource "aws_iam_role_policy" "order_processing" {
  name = "order-platform-phase6-order-processing"
  role = aws_iam_role.task.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Phase6OrderProcessingQueueAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage"
        ]
        Resource = "arn:aws:sqs:ap-south-1:992382645171:order-platform-phase6-order-processing"
      }
    ]
  })
}

import {
  to = aws_iam_role_policy.order_processing
  id = "order-platform-phase4-task-role:order-platform-phase6-order-processing"
}

