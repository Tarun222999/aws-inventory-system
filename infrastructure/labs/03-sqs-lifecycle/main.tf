terraform {
  required_version = ">= 1.16.0, < 2.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 7.0"
    }
  }
}

provider "aws" {
  region = "ap-south-1"
}

resource "aws_sqs_queue" "learning" {
  name                      = "order-platform-phase9-tf-lab-20261004"
  message_retention_seconds = 7200
  receive_wait_time_seconds = 10
  tags = {
    Project     = "aws-order-platform"
    Environment = "learning"
    Owner       = "Tarun"
    AutoCleanup = "false"
  }

}

output "queue_url" {
  description = "URL of the Terraform-managed learning queue"
  value       = aws_sqs_queue.learning.url
}
