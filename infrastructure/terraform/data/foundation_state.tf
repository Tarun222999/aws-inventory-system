data "terraform_remote_state" "foundation" {
  backend = "s3"

  config = {
    bucket = "aws-order-platform-tfstate-992382645171-ap-south-1"
    key    = "foundation/terraform.tfstate"
    region = "ap-south-1"

    allowed_account_ids = ["992382645171"]
  }
}