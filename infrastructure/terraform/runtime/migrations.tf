resource "aws_cloudwatch_log_group" "migrations" {
  name              = "/aws/order-platform/phase9/migrations"
  retention_in_days = 1
}

resource "aws_ecs_task_definition" "migrations" {
  family                   = "order-platform-phase9-migrations"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"

  execution_role_arn = data.terraform_remote_state.foundation.outputs.execution_role_arn
  task_role_arn      = data.terraform_remote_state.foundation.outputs.task_role_arn

  container_definitions = jsonencode([
    merge(
      jsondecode(aws_ecs_task_definition.api.container_definitions)[0],
      {
        name         = "migrations"
        command      = ["npm", "run", "migrate:run", "--workspace", "@order-platform/api"]
        portMappings = []

        logConfiguration = {
          logDriver = "awslogs"
          options = {
            "awslogs-group"         = aws_cloudwatch_log_group.migrations.name
            "awslogs-region"        = var.aws_region
            "awslogs-stream-prefix" = "migrations"
          }
        }
      }
    )
  ])
}