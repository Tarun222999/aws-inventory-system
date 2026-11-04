variable "enable_operations" {
  description = "Create the optional notifications, reporting and monitoring resources."
  type        = bool
  default     = false
}

variable "operations_email" {
  description = "Test inbox used for SNS and as both sender and recipient in SES."
  type        = string
  sensitive   = true
  default     = null

  validation {
    condition     = !var.enable_operations || can(regex("^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$", var.operations_email))
    error_message = "Supply operations_email when enabling operations."
  }
}

variable "enable_report_schedule" {
  description = "Enable the daily report after verifying the email identity and testing the Lambda."
  type        = bool
  default     = false
}

module "operations" {
  count  = var.enable_operations ? 1 : 0
  source = "../modules/operations"

  region               = var.aws_region
  account_id           = var.aws_account_id
  email                = var.operations_email
  schedule_enabled     = var.enable_report_schedule
  event_bus_name       = data.terraform_remote_state.data.outputs.order_event_bus_name
  orders_dlq_name      = split(":", data.terraform_remote_state.data.outputs.orders_dlq_arn)[5]
  load_balancer_suffix = aws_lb.api.arn_suffix
  vpc_id               = data.terraform_remote_state.foundation.outputs.vpc_id
  private_subnet_id    = data.terraform_remote_state.foundation.outputs.private_subnet_ids[1]
  app_security_group   = data.terraform_remote_state.foundation.outputs.app_security_group_id
  db_host              = aws_db_instance.main.address
  db_port              = aws_db_instance.main.port
  db_name              = aws_db_instance.main.db_name
  db_secret_arn        = aws_db_instance.main.master_user_secret[0].secret_arn
  report_bucket_name   = data.terraform_remote_state.data.outputs.product_images_bucket_name
  report_bucket_arn    = data.terraform_remote_state.data.outputs.product_images_bucket_arn
  lambda_zip           = "${path.root}/../../../.artifacts/phase9-operations.zip"
}
