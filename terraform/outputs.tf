output "api_endpoint" {
  description = "URL pública do endpoint de autenticação (POST)."
  value       = "${aws_apigatewayv2_api.this.api_endpoint}/authenticate"
}

output "lambda_function_name" {
  description = "Nome da Lambda function criada."
  value       = aws_lambda_function.authenticate.function_name
}

output "lambda_function_arn" {
  description = "ARN da Lambda function criada."
  value       = aws_lambda_function.authenticate.arn
}
