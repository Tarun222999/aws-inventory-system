terraform {
  required_version = ">= 1.16.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws",
      version = ">= 5.0, < 7.0"

    }
  }
}


provider "aws" {
  region = "ap-south-1"
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

output "aws_account_id" {
  description = "Aws Account terraform authenticated to"
  value       = data.aws_caller_identity.current.account_id
}


output "aws_region" {
  description = "AWS Region selected by the provider"
  value       = data.aws_region.current.region
}


output "availability_zones" {
  description = "Availability Zones available to this account in the selected Region"
  value       = data.aws_availability_zones.available.names
}


