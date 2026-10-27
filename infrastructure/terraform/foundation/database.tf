resource "aws_db_subnet_group" "main" {
  name        = "order-platform-phase5-db-subnet-group"
  description = "Private RDS subnet group for Phase 5 learning"

  subnet_ids = [
    aws_subnet.private_a.id,
    aws_subnet.private_b.id
  ]

  tags = {
    Name = "order-platform-phase5-db-subnet-group"
  }

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_db_subnet_group.main
  id = "order-platform-phase5-db-subnet-group"
}


resource "aws_db_parameter_group" "postgres" {
  name        = "order-platform-phase5-postgres16"
  family      = "postgres16"
  description = "Phase 5 PostgreSQL 16 settings requiring TLS"

  tags = {
    Name = "order-platform-phase5-postgres16"
  }

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_db_parameter_group.postgres
  id = "order-platform-phase5-postgres16"
}



