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


variable "app_image_digest" {
  description = "Exact ECR image digest used by application containers"
  type        = string
}

variable "service_desired_count" {
  description = "Number of tasks to run for each application service"
  type        = number
  default     = 0

  validation {
    condition     = contains([0, 1], var.service_desired_count)
    error_message = "Use 0 or 1 task per service for this learning project."
  }
}