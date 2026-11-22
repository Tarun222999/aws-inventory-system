resource "aws_iam_role" "github_ecr_publisher" {
  name                 = "order-platform-github-ecr-publisher"
  description          = "Publish backend images to the project ECR repository"
  assume_role_policy   = data.aws_iam_policy_document.github_trust.json
  max_session_duration = 3600
}

resource "aws_iam_role_policy" "github_ecr_publish" {
  name = "order-platform-ecr-publish"
  role = aws_iam_role.github_ecr_publisher.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AuthenticateToECR"
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = "ap-south-1"
          }
        }
      },
      {
        Sid    = "PublishToProjectRepository"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
          "ecr:BatchGetImage",
          "ecr:DescribeImages"
        ]
        Resource = "arn:aws:ecr:ap-south-1:992382645171:repository/order-platform-phase4-api"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = "ap-south-1"
          }
        }
      }
    ]
  })
}

output "github_ecr_publisher_role_arn" {
  description = "Role used by the backend image publishing workflow"
  value       = aws_iam_role.github_ecr_publisher.arn
}