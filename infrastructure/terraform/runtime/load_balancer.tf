resource "aws_lb_target_group" "api" {
  name        = "order-platform-phase9-api"
  port        = 3000
  protocol    = "HTTP"
  target_type = "ip"

  vpc_id = data.terraform_remote_state.foundation.outputs.vpc_id

  deregistration_delay = 30

  health_check {
    path                = "/ready"
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }

  tags = {
    Name = "order-platform-phase9-api"
  }
}



resource "aws_lb" "api" {
  name               = "order-platform-phase9-api"
  internal           = false
  load_balancer_type = "application"

  subnets = data.terraform_remote_state.foundation.outputs.public_subnet_ids

  security_groups = [
    data.terraform_remote_state.foundation.outputs.alb_security_group_id
  ]

  enable_deletion_protection = false

  tags = {
    Name = "order-platform-phase9-api"
  }
}


data "aws_acm_certificate" "api_origin" {
  domain      = "api-origin.tarunapps.com"
  statuses    = ["ISSUED"]
  types       = ["AMAZON_ISSUED"]
  most_recent = true
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.api.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = data.aws_acm_certificate.api_origin.arn

  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Forbidden"
      status_code  = "403"
    }
  }
}



resource "aws_lb_listener_rule" "api_origin" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  condition {
    http_header {
      http_header_name = "X-Origin-Verify"
      values = [
        sensitive(data.terraform_remote_state.foundation.outputs.origin_verify_header)
      ]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}