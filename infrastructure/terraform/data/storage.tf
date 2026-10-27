resource "aws_s3_bucket" "product_images" {
  bucket        = "order-platform-phase5-product-images-2bf589a4"
  force_destroy = false

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = aws_s3_bucket.product_images
  id = "order-platform-phase5-product-images-2bf589a4"
}


resource "aws_s3_bucket_public_access_block" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

import {
  to = aws_s3_bucket_public_access_block.product_images
  id = "order-platform-phase5-product-images-2bf589a4"
}


resource "aws_s3_bucket_server_side_encryption_configuration" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }

    bucket_key_enabled = true
  }
}

import {
  to = aws_s3_bucket_server_side_encryption_configuration.product_images
  id = "order-platform-phase5-product-images-2bf589a4"
}


resource "aws_s3_bucket_ownership_controls" "product_images" {
  bucket = aws_s3_bucket.product_images.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

import {
  to = aws_s3_bucket_ownership_controls.product_images
  id = "order-platform-phase5-product-images-2bf589a4"
}