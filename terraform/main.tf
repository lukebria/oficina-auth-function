# AWS Academy Learner Lab nao permite criar IAM Roles (iam:CreateRole negado para o usuario voclabs) - usa a
# LabRole pronta do laboratorio, que ja confia em lambda.amazonaws.com e cobre logs no CloudWatch. Mesmo
# padrao do oficina-mvp-infra-iac (data_source_iam.tf).
data "aws_iam_role" "lab_role" {
  name = "LabRole"
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "oficina-mvp-auth-logs"
    Description = "Logs da Lambda de login por CPF"
  }
}

resource "aws_lambda_function" "authenticate" {
  function_name = var.function_name
  description   = "Login por CPF: valida o cliente no backend e emite o JWT"
  role          = data.aws_iam_role.lab_role.arn
  handler       = "src/handlers/aws/authenticateHandler.handler"
  runtime       = "nodejs22.x"
  timeout       = 10
  memory_size   = 256

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  # New Relic Lambda Extension (plano 05) - só anexada se var.new_relic_lambda_layer_arn for configurada.
  # Cobre invocações/erros/duração via a extension sozinha; tracing distribuído completo exigiria trocar o
  # handler para o wrapper da New Relic (NEW_RELIC_LAMBDA_HANDLER) - passo manual adicional, não feito aqui
  # porque o nome exato do pacote wrapper varia por versão do runtime/agente New Relic e precisa ser
  # conferido contra a documentação atual no momento em que alguém for ativar isso de verdade.
  layers = var.new_relic_lambda_layer_arn != "" ? [var.new_relic_lambda_layer_arn] : []

  environment {
    variables = merge(
      {
        BACKEND_BASE_URL    = var.backend_base_url
        INTERNAL_API_KEY    = var.internal_api_key
        CUSTOMER_JWT_SECRET = var.customer_jwt_secret
        CUSTOMER_JWT_ISSUER = var.customer_jwt_issuer
        TOKEN_TTL_SECONDS   = tostring(var.token_ttl_seconds)
      },
      var.new_relic_license_key != "" ? {
        NEW_RELIC_ACCOUNT_ID  = var.new_relic_account_id
        NEW_RELIC_LICENSE_KEY = var.new_relic_license_key
      } : {}
    )
  }

  tags = {
    Name        = "oficina-mvp-auth-lambda"
    Description = "Login por CPF: valida o cliente no backend e emite o JWT"
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda,
  ]
}
