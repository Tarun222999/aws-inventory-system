resource "aws_db_instance" "main" {
  identifier     = "order-platform-phase9-postgres"
  engine         = "postgres"
  engine_version = "16.14"
  instance_class = "db.t4g.micro"

  db_name                     = "order_platform"
  username                    = "order_admin"
  manage_master_user_password = true

  allocated_storage     = 20
  max_allocated_storage = 0
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name = data.terraform_remote_state.foundation.outputs.db_subnet_group_name
  parameter_group_name = data.terraform_remote_state.foundation.outputs.db_parameter_group_name

  vpc_security_group_ids = [
    data.terraform_remote_state.foundation.outputs.db_security_group_id
  ]

  publicly_accessible        = false
  multi_az                   = false
  port                       = 5432
  auto_minor_version_upgrade = false
  monitoring_interval        = 0

  backup_retention_period  = 0
  deletion_protection      = false
  skip_final_snapshot      = true
  delete_automated_backups = true

  tags = {
    Name = "order-platform-phase9-postgres"
  }
}