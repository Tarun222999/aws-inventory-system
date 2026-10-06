terraform {
  backend "s3" {
    bucket = "aws-order-platform-tfstate-992382645171-ap-south-1"
    key    = "foundation/terraform.tfstate"
    region = "ap-south-1"

    encrypt             = true
    use_lockfile        = true
    allowed_account_ids = ["992382645171"]
  }
}