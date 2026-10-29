locals {
  app_image = "${data.terraform_remote_state.foundation.outputs.ecr_repository_url}@${var.app_image_digest}"
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/order-platform/phase9/api"
  retention_in_days = 1
}

resource "aws_ecs_task_definition" "api" {
  family                   = "order-platform-phase9-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"

  execution_role_arn = data.terraform_remote_state.foundation.outputs.execution_role_arn
  task_role_arn      = data.terraform_remote_state.foundation.outputs.task_role_arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = local.app_image
      essential = true
      command   = ["npm", "run", "start", "--workspace", "@order-platform/api"]

      portMappings = [
        { containerPort = 3000, protocol = "tcp" }
      ]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "API_HOST", value = "0.0.0.0" },
        { name = "API_PORT", value = "3000" },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "DB_HOST", value = aws_db_instance.main.address },
        { name = "DB_PORT", value = tostring(aws_db_instance.main.port) },
        { name = "DB_NAME", value = aws_db_instance.main.db_name },
        { name = "DB_SECRET_ID", value = aws_db_instance.main.master_user_secret[0].secret_arn },
        { name = "DATABASE_SSL_CA_PATH", value = "/app/certs/global-bundle.pem" },
        { name = "PRODUCT_IMAGE_BUCKET", value = data.terraform_remote_state.data.outputs.product_images_bucket_name }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api"
        }
      }
    }
  ])

  depends_on = [aws_iam_role_policy.runtime_db_secret]
}


resource "aws_cloudwatch_log_group" "worker" {
  name              = "/aws/order-platform/phase9/worker"
  retention_in_days = 1
}

resource "aws_ecs_task_definition" "worker" {
  family                   = "order-platform-phase9-worker"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"

  execution_role_arn = data.terraform_remote_state.foundation.outputs.execution_role_arn
  task_role_arn      = data.terraform_remote_state.foundation.outputs.task_role_arn

  container_definitions = jsonencode([
    {
      name      = "worker"
      image     = local.app_image
      essential = true
      command   = ["npm", "run", "sqs:worker", "--workspace", "@order-platform/worker"]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "DB_HOST", value = aws_db_instance.main.address },
        { name = "DB_PORT", value = tostring(aws_db_instance.main.port) },
        { name = "DB_NAME", value = aws_db_instance.main.db_name },
        { name = "DB_SECRET_ID", value = aws_db_instance.main.master_user_secret[0].secret_arn },
        { name = "DATABASE_SSL_CA_PATH", value = "/app/certs/global-bundle.pem" },
        { name = "ORDER_PROCESSING_QUEUE_URL", value = data.terraform_remote_state.data.outputs.orders_queue_url }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.worker.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "worker"
        }
      }
    }
  ])

  depends_on = [aws_iam_role_policy.runtime_db_secret]
}