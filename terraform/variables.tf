variable "aws_region" {
  type        = string
  description = "Região AWS onde os recursos serão provisionados."
}

variable "environment" {
  type        = string
  description = "Nome do ambiente (ex: dev, prod), usado para nomear/tagar os recursos."
  default     = "dev"
}

variable "function_name" {
  type        = string
  description = "Nome da Lambda function."
  default     = "oficina-auth-function"
}

variable "backend_base_url" {
  type        = string
  description = "URL base do backend oficina-mvp-java (sem barra final), usada para consultar GET /api/internal/customers/{document}."
}

variable "internal_api_key" {
  type        = string
  description = "Chave de serviço-a-serviço para consultar o endpoint interno do backend (mesmo valor de INTERNAL_API_KEY no backend)."
  sensitive   = true
}

variable "customer_jwt_secret" {
  type        = string
  description = "Segredo (HS256) usado para assinar o JWT do cliente (mesmo valor de CUSTOMER_JWT_SECRET no backend e no Kong)."
  sensitive   = true
}

variable "customer_jwt_issuer" {
  type        = string
  description = "Claim 'iss' do token de cliente - precisa bater com o username do KongConsumer em oficina-mvp-infra-iac (ADR-006)."
  default     = "customer-app"
}

variable "token_ttl_seconds" {
  type        = number
  description = "Validade do token emitido, em segundos."
  default     = 900
}

variable "log_retention_days" {
  type        = number
  description = "Retenção dos logs da Lambda no CloudWatch, em dias."
  default     = 14
}

# --- Observabilidade (plano 05) - tudo opcional, vazio por padrão = nada instrumentado ---

variable "new_relic_account_id" {
  type        = string
  description = "Account ID da conta New Relic. Vazio = extension não é anexada nem configurada."
  default     = ""
}

variable "new_relic_license_key" {
  type        = string
  description = "License Key da conta New Relic (sensível). Vazio = extension não é anexada nem configurada."
  sensitive   = true
  default     = ""
}

variable "new_relic_lambda_layer_arn" {
  type        = string
  description = <<-EOT
    ARN da layer "New Relic Lambda Extension" para Node.js, específico da região/conta - conferir o valor
    atual em https://docs.newrelic.com/docs/serverless-function-monitoring/aws-lambda-monitoring/enable-lambda-monitoring/nodejs-agent-install
    (varia por região da AWS e é atualizado com frequência pela New Relic, por isso não tem um default
    fixo aqui). Vazio = layer não é anexada.
  EOT
  default     = ""
}

variable "tags" {
  type        = map(string)
  description = "Tags extras aplicadas a todos os recursos, além das default_tags do provider."
  default     = {}
}
