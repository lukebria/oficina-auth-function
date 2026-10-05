terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region

  # Tags comuns - padrão do projeto (plano 11): mesmo Project nos 3 repos de Terraform, para filtrar tudo no
  # Tag Editor com Project = oficina-mvp. Cada recurso ainda recebe Name + Description dizendo o que é.
  default_tags {
    tags = merge(
      {
        Project     = "oficina-mvp"
        Repository  = "oficina-auth-function"
        Component   = "autenticacao"
        Environment = "lab"
        ManagedBy   = "terraform"
        Course      = "FIAP POSTECH 13SOAT - Tech Challenge Fase 3"
      },
      var.tags,
    )
  }
}
