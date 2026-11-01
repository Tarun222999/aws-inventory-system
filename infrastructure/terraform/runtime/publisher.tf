resource "aws_cloudwatch_log_group" "publisher" {
  name              = "/aws/order-platform/phase9/publisher"
  retention_in_days = 1
}

resource "aws_ecs_task_definition" "publisher" {
  family                   = "order-platform-phase9-publisher"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"

  execution_role_arn = data.terraform_remote_state.foundation.outputs.execution_role_arn
  task_role_arn      = data.terraform_remote_state.foundation.outputs.task_role_arn

  container_definitions = jsonencode([
    merge(
      jsondecode(aws_ecs_task_definition.worker.container_definitions)[0],
      {
        name    = "publisher"
        command = ["npm", "run", "outbox:publish", "--workspace", "@order-platform/worker"]

        environment = concat(
          jsondecode(aws_ecs_task_definition.worker.container_definitions)[0].environment,
          [
            {
              name  = "ORDER_EVENT_BUS_NAME"
              value = data.terraform_remote_state.data.outputs.order_event_bus_name
            }
          ]
        )

        logConfiguration = {
          logDriver = "awslogs"
          options = {
            "awslogs-group"         = aws_cloudwatch_log_group.publisher.name
            "awslogs-region"        = var.aws_region
            "awslogs-stream-prefix" = "publisher"
          }
        }
      }
    )
  ])

  depends_on = [
    aws_iam_role_policy.runtime_db_secret,
    aws_iam_role_policy.publish_order_events
  ]
}