output "aws_account_id" {
  description = "AWS account verified by the provider"
  value       = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  description = "AWS Region used by this root module"
  value       = data.aws_region.current.region
}



output "migration_task_definition_arn" {
  description = "Task definition for the one-time migration run"
  value       = aws_ecs_task_definition.migrations.arn
}

output "task_network_configuration" {
  description = "Network placement for the learning tasks"
  value = {
    subnets          = local.task_subnet_ids
    security_groups  = local.task_security_group_ids
    assign_public_ip = local.task_assign_public_ip
  }
}