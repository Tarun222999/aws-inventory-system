resource "random_password" "origin_verify" {
  length  = 48
  special = false
}

output "origin_verify_header" {
  description = "Shared value for CloudFront-to-ALB verification"
  value       = random_password.origin_verify.result
  sensitive   = true
}