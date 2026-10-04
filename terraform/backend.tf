# ==============================================================================
# BACKEND CONFIGURATION
# ==============================================================================
# Reaproveita o mesmo bucket S3 e a mesma tabela DynamoDB de lock dos outros
# repositórios de infra do projeto (oficina-mvp-infra-iac / oficina-mvp-infra-db)
# — key própria para não colidir com os states deles.
#
# DEPENDÊNCIA: a tabela "oficina-mvp-infra-iac-tf-lock" precisa já existir
# (criada pela Fase 1 do bootstrap de lock em oficina-mvp-infra-iac/dynamodb.tf)
# antes do primeiro `terraform init` aqui — sem ela, o backend não consegue
# adquirir lock. Ver README, seção "Deploy (Terraform)".
# ==============================================================================

terraform {
  backend "s3" {
    bucket         = "oficina-mvp-tfstate-536036031274"
    key            = "oficina-lab/auth-function/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "oficina-mvp-infra-iac-tf-lock"
  }
}
