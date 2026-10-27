output "aws_account_id" {
  description = "AWS account verified by the provider"
  value       = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  description = "AWS Region used by this root module"
  value       = data.aws_region.current.region
}


output "ecr_repository_arn" {
  description = "ARN of the API container repository"
  value       = aws_ecr_repository.api.arn
}

output "ecr_repository_url" {
  description = "URL used when tagging and deploying container images"
  value       = aws_ecr_repository.api.repository_url
}

output "ecs_cluster_arn" {
  description = "ECS cluster where application tasks will run"
  value       = aws_ecs_cluster.main.arn
}


output "vpc_id" {
  description = "VPC for application infrastructure"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnets for the load balancer"
  value = [
    aws_subnet.public_a.id,
    aws_subnet.public_b.id
  ]
}

output "private_subnet_ids" {
  description = "Private subnets available for application and database placement"
  value = [
    aws_subnet.private_a.id,
    aws_subnet.private_b.id
  ]
}


output "alb_security_group_id" {
  description = "Security group for the load balancer"
  value       = aws_security_group.alb.id
}

output "app_security_group_id" {
  description = "Security group for application tasks"
  value       = aws_security_group.app.id
}

output "db_security_group_id" {
  description = "Security group for the database"
  value       = aws_security_group.db.id
}

output "execution_role_arn" {
  description = "Role ECS uses to pull images and write logs"
  value       = aws_iam_role.execution.arn
}

output "task_role_arn" {
  description = "Role the application uses to access AWS services"
  value       = aws_iam_role.task.arn
}


output "db_subnet_group_name" {
  description = "Private subnet group for the practice database"
  value       = aws_db_subnet_group.main.name
}

output "db_parameter_group_name" {
  description = "PostgreSQL parameter group for the practice database"
  value       = aws_db_parameter_group.postgres.name
}