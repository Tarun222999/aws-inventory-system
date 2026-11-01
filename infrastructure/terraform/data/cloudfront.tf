resource "aws_cloudfront_distribution" "frontend" {
  enabled             = false
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = ["stockroom.tarunapps.com"]
  http_version        = "http2"
  price_class         = "PriceClass_All"

  web_acl_id = "arn:aws:wafv2:us-east-1:992382645171:global/webacl/CreatedByCloudFront-d0f8a502/9ea40cdc-aa99-45ca-a5cd-6a7298218f68"

  origin {
    origin_id = "order-platform-phase8-frontend-992382645171.s3.ap-south-1.amazonaws.com-muf3r0mft8s"

    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id


  }

  default_cache_behavior {
    target_origin_id = "order-platform-phase8-frontend-992382645171.s3.ap-south-1.amazonaws.com-muf3r0mft8s"

    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  origin {
    origin_id   = "api-origin.tarunapps.com"
    domain_name = "api-origin.tarunapps.com"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    custom_header {
      name = "X-Origin-Verify"
      value = sensitive(
        data.terraform_remote_state.foundation.outputs.origin_verify_header
      )
    }
  }

  ordered_cache_behavior {
    path_pattern     = "/api/*"
    target_origin_id = "api-origin.tarunapps.com"

    allowed_methods = [
      "GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"
    ]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = "arn:aws:acm:us-east-1:992382645171:certificate/16f68502-110d-4f4c-8d78-0efff4d91eb2"
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "order-platform-phase8-frontend"
  }

  lifecycle {
    prevent_destroy = true
  }
}


import {
  to = aws_cloudfront_distribution.frontend
  id = "EY6998IJC3CMS"
}