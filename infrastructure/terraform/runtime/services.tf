resource "aws_ecs_service" "api" {
  name            = "order-platform-phase9-api"
  cluster         = data.terraform_remote_state.foundation.outputs.ecs_cluster_arn
  task_definition = aws_ecs_task_definition.api.arn
  launch_type     = "FARGATE"
  desired_count   = var.service_desired_count

  health_check_grace_period_seconds = 60

  network_configuration {
    subnets          = local.task_subnet_ids
    security_groups  = local.task_security_group_ids
    assign_public_ip = local.task_assign_public_ip
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener_rule.api_origin]
}


resource "aws_ecs_service" "worker" {
  name            = "order-platform-phase9-worker"
  cluster         = data.terraform_remote_state.foundation.outputs.ecs_cluster_arn
  task_definition = aws_ecs_task_definition.worker.arn
  launch_type     = "FARGATE"
  desired_count   = var.service_desired_count

  network_configuration {
    subnets          = local.task_subnet_ids
    security_groups  = local.task_security_group_ids
    assign_public_ip = local.task_assign_public_ip
  }
}



resource "aws_ecs_service" "publisher" {
  name            = "order-platform-phase9-publisher"
  cluster         = data.terraform_remote_state.foundation.outputs.ecs_cluster_arn
  task_definition = aws_ecs_task_definition.publisher.arn
  launch_type     = "FARGATE"
  desired_count   = var.service_desired_count

  network_configuration {
    subnets          = local.task_subnet_ids
    security_groups  = local.task_security_group_ids
    assign_public_ip = local.task_assign_public_ip
  }
}