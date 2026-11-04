variable "region" {
  type = string
}

variable "account_id" {
  type = string
}

variable "email" {
  type      = string
  sensitive = true
}

variable "schedule_enabled" {
  type = bool
}

variable "event_bus_name" {
  type = string
}

variable "orders_dlq_name" {
  type = string
}

variable "load_balancer_suffix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_id" {
  type = string
}

variable "app_security_group" {
  type = string
}

variable "db_host" {
  type = string
}

variable "db_port" {
  type = number
}

variable "db_name" {
  type = string
}

variable "db_secret_arn" {
  type = string
}

variable "report_bucket_name" {
  type = string
}

variable "report_bucket_arn" {
  type = string
}

variable "lambda_zip" {
  type = string
}
