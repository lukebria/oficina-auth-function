data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  name               = "${var.function_name}-exec"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "authenticate" {
  function_name = var.function_name
  role          = aws_iam_role.lambda_exec.arn
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

  depends_on = [
    aws_cloudwatch_log_group.lambda,
    aws_iam_role_policy_attachment.lambda_basic_execution,
  ]
}
