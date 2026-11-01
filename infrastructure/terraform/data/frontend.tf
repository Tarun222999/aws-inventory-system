resource "aws_s3_bucket" "frontend" {
  bucket        = "order-platform-phase8-frontend-992382645171"
  force_destroy = false

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_s3_bucket.frontend
  id = "order-platform-phase8-frontend-992382645171"
}


resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

import {
  to = aws_s3_bucket_public_access_block.frontend
  id = "order-platform-phase8-frontend-992382645171"
}



resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }

    bucket_key_enabled = true
  }
}

import {
  to = aws_s3_bucket_server_side_encryption_configuration.frontend
  id = "order-platform-phase8-frontend-992382645171"
}


resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

import {
  to = aws_s3_bucket_ownership_controls.frontend
  id = "order-platform-phase8-frontend-992382645171"
}


resource "aws_cloudfront_origin_access_control" "frontend" {
  name = "oac-order-platform-phase8-frontend-992382645171.s3.a-muf496ml8mt"

  description                       = "Created by CloudFront"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

import {
  to = aws_cloudfront_origin_access_control.frontend
  id = "E3IV91DFGUN3YF"
}



resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2008-10-17"
    Id      = "PolicyForCloudFrontPrivateContent"

    Statement = [{
      Sid    = "AllowCloudFrontServicePrincipal"
      Effect = "Allow"

      Principal = {
        Service = "cloudfront.amazonaws.com"
      }

      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.frontend.arn}/*"

      Condition = {
        ArnLike = {
          "AWS:SourceArn" = "arn:aws:cloudfront::992382645171:distribution/EY6998IJC3CMS"
        }
      }
    }]
  })
}

import {
  to = aws_s3_bucket_policy.frontend
  id = "order-platform-phase8-frontend-992382645171"
}