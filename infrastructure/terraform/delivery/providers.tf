provider "aws" {
  region              = "ap-south-1"
  allowed_account_ids = ["992382645171"]

  default_tags {
    tags = {
      Project     = "aws-order-platform"
      Environment = "learning"
      Owner       = "Tarun222999"
      AutoCleanup = "false"
    }
  }
}