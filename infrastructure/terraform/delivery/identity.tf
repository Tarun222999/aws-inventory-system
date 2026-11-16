resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_policy_document" "github_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type = "Federated"
      identifiers = [
        aws_iam_openid_connect_provider.github.arn
      ]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:Tarun222999@111749548/aws-inventory-system@1307711935:ref:refs/heads/main"
      ]
    }
  }
}

resource "aws_iam_role" "github_identity_test" {
  name                 = "order-platform-github-identity-test"
  description          = "Initial GitHub Actions OIDC authentication test"
  assume_role_policy   = data.aws_iam_policy_document.github_trust.json
  max_session_duration = 3600
}

output "github_identity_test_role_arn" {
  description = "Role ARN for the GitHub authentication test"
  value       = aws_iam_role.github_identity_test.arn
}