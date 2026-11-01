locals {
  task_subnet_ids = data.terraform_remote_state.foundation.outputs.public_subnet_ids

  task_security_group_ids = [
    data.terraform_remote_state.foundation.outputs.app_security_group_id
  ]

  task_assign_public_ip = true
}