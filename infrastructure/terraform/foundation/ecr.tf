resource "aws_ecr_repository" "api" {
  name                 = "order-platform-phase4-api"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = false

  encryption_configuration {
    encryption_type = "AES256"
  }

  image_scanning_configuration {
    scan_on_push = false
  }

  tags = {
    Name        = "order-platform-phase4-api"
    Project     = "aws-order-platform"
    Environment = "learning"
    Owner       = var.owner
    AutoCleanup = "false"
  }

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_ecr_repository.api
  id = "order-platform-phase4-api"
}