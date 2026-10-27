data "terraform_remote_state" "data" {
  backend = "s3"

  config = {
    bucket              = "aws-order-platform-tfstate-992382645171-ap-south-1"
    key                 = "data/terraform.tfstate"
    region              = "ap-south-1"
    encrypt             = true
    allowed_account_ids = ["992382645171"]
  }
}


output "data_orders_queue_url" {
  description = "Order queue URL obtained from data state"
  value       = data.terraform_remote_state.data.outputs.orders_queue_url
}