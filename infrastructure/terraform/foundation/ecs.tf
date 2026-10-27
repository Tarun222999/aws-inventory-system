resource "aws_ecs_cluster" "main" {
  name = "order-platform-phase4-cluster"

  setting {
    name  = "containerInsights"
    value = "disabled"
  }

  configuration {
    execute_command_configuration {
      logging = "DEFAULT"
    }
  }

  tags = {
    Name = "order-platform-phase4-cluster"
  }

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_ecs_cluster.main
  id = "order-platform-phase4-cluster"
}



resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = [
    "FARGATE",
    "FARGATE_SPOT"
  ]
}

import {
  to = aws_ecs_cluster_capacity_providers.main
  id = "order-platform-phase4-cluster"
}