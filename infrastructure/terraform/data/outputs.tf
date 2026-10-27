output "aws_account_id" {
  description = "AWS account verified by the provider"
  value       = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  description = "AWS Region used by this root module"
  value       = data.aws_region.current.region
}

output "product_images_bucket_name" {
  description = "Bucket used to store product images"
  value       = aws_s3_bucket.product_images.id
}

output "product_images_bucket_arn" {
  description = "Product-image bucket ARN for IAM policies"
  value       = aws_s3_bucket.product_images.arn
}

output "orders_queue_url" {
  description = "Queue URL used by the application to send and receive messages"
  value       = aws_sqs_queue.orders.url
}

output "orders_queue_arn" {
  description = "Order queue ARN for permissions and integrations"
  value       = aws_sqs_queue.orders.arn
}

output "orders_dlq_arn" {
  description = "Dead-letter queue ARN for integrations and monitoring"
  value       = aws_sqs_queue.orders_dlq.arn
}
