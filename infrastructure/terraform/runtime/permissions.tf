resource "aws_iam_role_policy" "runtime_db_secret" {
  name = "order-platform-phase9-read-db-secret"
  role = data.terraform_remote_state.foundation.outputs.task_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "secretsmanager:GetSecretValue"
        Resource = aws_db_instance.main.master_user_secret[0].secret_arn
      }
    ]
  })
}