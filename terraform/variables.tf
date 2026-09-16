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
  description = "Segredo (HS256) usado para assinar o JWT do cliente (mesmo valor de CUSTOMER_JWT_SECRET no backend)."
  sensitive   = true
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

variable "tags" {
  type        = map(string)
  description = "Tags extras aplicadas a todos os recursos, além das default_tags do provider."
  default     = {}
}
