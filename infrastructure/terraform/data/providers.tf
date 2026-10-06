provider "aws" {
  region = var.aws_region

  allowed_account_ids = [
    var.aws_account_id
  ]

  default_tags {
    tags = {
      Project     = "aws-order-platform"
      Environment = "learning"
      Owner       = var.owner
      AutoCleanup = "false"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}