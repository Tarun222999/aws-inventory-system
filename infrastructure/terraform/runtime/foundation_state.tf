data "terraform_remote_state" "foundation" {
  backend = "s3"

  config = {
    bucket              = "aws-order-platform-tfstate-992382645171-ap-south-1"
    key                 = "foundation/terraform.tfstate"
    region              = "ap-south-1"
    encrypt             = true
    allowed_account_ids = ["992382645171"]
  }
}

output "foundation_ecr_repository_url" {
  description = "ECR repository URL obtained from foundation state"
  value       = data.terraform_remote_state.foundation.outputs.ecr_repository_url
}


output "foundation_ecs_cluster_arn" {
  description = "ECS cluster ARN obtained from foundation state"
  value       = data.terraform_remote_state.foundation.outputs.ecs_cluster_arn
}