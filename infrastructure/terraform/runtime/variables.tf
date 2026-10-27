variable "aws_account_id" {
  description = "AWS account allowed to use this configuration"
  type        = string
  default     = "992382645171"
}

variable "aws_region" {
  description = "AWS Region for the learning architecture"
  type        = string
  default     = "ap-south-1"
}

variable "owner" {
  description = "Owner tag applied to supported resources"
  type        = string
  default     = "Tarun222999"
}
