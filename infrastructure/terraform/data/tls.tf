resource "aws_acm_certificate" "frontend" {
  provider = aws.edge

  domain_name       = "stockroom.tarunapps.com"
  validation_method = "DNS"
  key_algorithm     = "RSA_2048"

  options {
    certificate_transparency_logging_preference = "ENABLED"
  }

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_acm_certificate.frontend
  id = "arn:aws:acm:us-east-1:992382645171:certificate/16f68502-110d-4f4c-8d78-0efff4d91eb2"
}



resource "aws_acm_certificate" "api_origin" {
  domain_name       = "api-origin.tarunapps.com"
  validation_method = "DNS"
  key_algorithm     = "RSA_2048"

  options {
    certificate_transparency_logging_preference = "ENABLED"
  }

  tags = {
    Owner = "Tarun"
  }

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_acm_certificate.api_origin
  id = "arn:aws:acm:ap-south-1:992382645171:certificate/53875af6-8342-48b1-aa80-e9f61a38f8e7"
}


resource "aws_acm_certificate_validation" "frontend" {
  provider = aws.edge

  certificate_arn = aws_acm_certificate.frontend.arn

  validation_record_fqdns = [
    cloudflare_dns_record.frontend_validation.name
  ]
}

resource "aws_acm_certificate_validation" "api_origin" {
  certificate_arn = aws_acm_certificate.api_origin.arn

  validation_record_fqdns = [
    cloudflare_dns_record.origin_validation.name
  ]
}