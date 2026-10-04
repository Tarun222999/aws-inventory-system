terraform {
  required_version = ">= 1.16.0, < 2.0.0"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}


variable "greeting" {
  description = "Text written to the learning file"
  type        = string
  default     = "Hello from variable"
}

resource "local_file" "greeting" {
  filename = "${path.module}/hello.txt"
  content  = var.greeting
}


output "greeting_file_path" {
  description = "Path of the file managed by Terraform"
  value       = local_file.greeting.filename
}

