resource "cloudflare_dns_record" "frontend_validation" {
  zone_id = var.cloudflare_zone_id
  comment = "AWS ACM validation for stockroom.tarunapps.com"

  name = trimsuffix(
    one(aws_acm_certificate.frontend.domain_validation_options).resource_record_name,
    "."
  )

  content = trimsuffix(
    one(aws_acm_certificate.frontend.domain_validation_options).resource_record_value,
    "."
  )

  type    = "CNAME"
  ttl     = 1
  proxied = false

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = cloudflare_dns_record.frontend_validation
  id = "519fbc35cfb537c354db08f3e2323bb3/6adea7febd8819734f7e1bbfc8565b61"
}



resource "cloudflare_dns_record" "origin_validation" {
  zone_id = var.cloudflare_zone_id

  name = trimsuffix(
    one(aws_acm_certificate.api_origin.domain_validation_options).resource_record_name,
    "."
  )

  content = trimsuffix(
    one(aws_acm_certificate.api_origin.domain_validation_options).resource_record_value,
    "."
  )

  type    = "CNAME"
  ttl     = 1
  proxied = false

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = cloudflare_dns_record.origin_validation
  id = "519fbc35cfb537c354db08f3e2323bb3/c351dbae17f132e727dd7f0fedb13224"
}


resource "cloudflare_dns_record" "frontend" {
  zone_id = var.cloudflare_zone_id

  name    = "stockroom.tarunapps.com"
  type    = "CNAME"
  content = aws_cloudfront_distribution.frontend.domain_name
  ttl     = 1
  proxied = false

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = cloudflare_dns_record.frontend
  id = "519fbc35cfb537c354db08f3e2323bb3/30a054cb4d795ceb6bd1c4f284d5cd68"
}