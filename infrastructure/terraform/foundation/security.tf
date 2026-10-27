resource "aws_security_group" "alb" {
  name        = "order-platform-phase4-alb-sg"
  description = "Phase 4 public ALB security group"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "order-platform-phase4-alb-sg"
  }

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_security_group.alb
  id = "sg-037d90e37d307a692"
}



resource "aws_security_group" "app" {
  name        = "order-platform-phase4-task-sg"
  description = "Phase 4 ECS task security group"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "order-platform-phase4-task-sg"
  }

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_security_group.app
  id = "sg-09ee205b5eb8a0727"
}


resource "aws_security_group" "db" {
  name        = "order-platform-phase5-db-sg"
  description = "Allow PostgreSQL only from Phase 5 ECS tasks"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "order-platform-phase5-db-sg"
  }

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_security_group.db
  id = "sg-065c024612a098e00"
}


resource "aws_vpc_security_group_egress_rule" "alb_to_app" {
  security_group_id            = aws_security_group.alb.id
  referenced_security_group_id = aws_security_group.app.id
  ip_protocol                  = "tcp"
  from_port                    = 3000
  to_port                      = 3000

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_vpc_security_group_ingress_rule" "app_from_alb" {
  security_group_id            = aws_security_group.app.id
  referenced_security_group_id = aws_security_group.alb.id
  ip_protocol                  = "tcp"
  from_port                    = 3000
  to_port                      = 3000

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_vpc_security_group_egress_rule.alb_to_app
  id = "sgr-004372aed3e456bf1"
}

import {
  to = aws_vpc_security_group_ingress_rule.app_from_alb
  id = "sgr-026338f7551aaafd0"
}


resource "aws_vpc_security_group_egress_rule" "app_to_db" {
  security_group_id            = aws_security_group.app.id
  referenced_security_group_id = aws_security_group.db.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
  security_group_id            = aws_security_group.db.id
  referenced_security_group_id = aws_security_group.app.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_vpc_security_group_egress_rule.app_to_db
  id = "sgr-03c1c0bc66a48c566"
}

import {
  to = aws_vpc_security_group_ingress_rule.db_from_app
  id = "sgr-0d3442e116f8c2a38"
}


resource "aws_vpc_security_group_ingress_rule" "alb_from_cloudfront" {
  security_group_id = aws_security_group.alb.id
  prefix_list_id    = "pl-9aa247f3"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_vpc_security_group_egress_rule" "app_https" {
  security_group_id = aws_security_group.app.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_vpc_security_group_ingress_rule.alb_from_cloudfront
  id = "sgr-0fcb7d609618263b5"
}

import {
  to = aws_vpc_security_group_egress_rule.app_https
  id = "sgr-0d2cda905f229acfe"
}