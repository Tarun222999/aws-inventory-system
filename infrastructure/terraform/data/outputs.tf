output "aws_account_id" {
  description = "AWS account verified by the provider"
  value       = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  description = "AWS Region used by this root module"
  value       = data.aws_region.current.region
}
