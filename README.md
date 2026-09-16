# oficina-auth-function

Function Serverless de autenticação via CPF/CNPJ para o [`oficina-mvp-java`](../oficina-mvp-java) (backend da
oficina mecânica). Faz parte da fase 3 do tech challenge: um API Gateway (produto ainda em definição) fica na
frente desta function, que:

1. valida o CPF/CNPJ informado pelo cliente;
2. consulta `GET /api/internal/customers/{document}` no backend Java para confirmar existência/status do cliente;
3. assina e devolve um JWT válido para consumir as rotas públicas de OS do backend
   (`GET /api/public/service-orders/{code}`, `POST /api/public/service-orders/{code}/approval`).

## Stack

- Node.js LTS (22.x ou mais recente) + TypeScript.
- `jose` para assinatura JWT (HS256).
- `fetch` nativo do Node para chamar o backend — sem dependência extra de HTTP client.
- Jest + `ts-jest` para testes.

## Arquitetura: núcleo genérico + adapter fino por provedor

```
src/
  core/            regra de negócio pura — não importa AWS, HTTP nem a lib de JWT diretamente
    domain/errors.ts
    documentValidator.ts   porta em TS de DocumentValidator.java (mesmo algoritmo, mesma normalização)
    ports.ts                CustomerStatusPort, TokenSignerPort — interfaces que o núcleo consome
    authenticateByDocument.ts   caso de uso: valida -> consulta status -> assina token
  adapters/        implementações concretas das portas
    config.ts                      lê/valida variáveis de ambiente
    customerStatusHttpClient.ts    CustomerStatusPort via fetch
    jwtTokenSigner.ts               TokenSignerPort via jose (HS256)
  handlers/
    aws/authenticateHandler.ts     adapter fino: evento do API Gateway -> core -> resposta HTTP
```

O núcleo (`core/`) não sabe que roda em AWS Lambda. Portar para outro provedor serverless (ex: Google Cloud
Functions, que o autor deste projeto já usou antes) é escrever um novo arquivo em `handlers/<provedor>/`, chamando
o mesmo `authenticateByDocument` com as mesmas portas — sem tocar em `core/` nem nos `adapters/`.

## Contrato com o backend `oficina-mvp-java`

Ver `docs/architecture.md` (seção 5, "Segurança") e `README.md` do backend para o lado que já está implementado
lá. Resumo do que esta function precisa respeitar:

| Item | Valor |
|------|-------|
| Endpoint de consulta | `GET {BACKEND_BASE_URL}/api/internal/customers/{document}` |
| Autenticação da consulta | Header `X-Internal-Api-Key: <INTERNAL_API_KEY>` (mesmo valor do backend) |
| Resposta (cliente existe) | `200 {"found": true, "customerId": number, "name": string, "status": "ACTIVE" \| "INACTIVE"}` |
| Resposta (não existe) | `404 {"found": false, "customerId": null, "name": null, "status": "NOT_FOUND"}` |
| Algoritmo do JWT | HS256 |
| Segredo do JWT | `CUSTOMER_JWT_SECRET` — **precisa ser o mesmo valor** configurado no backend, nunca o `JWT_SECRET` administrativo |
| Claims do JWT | `sub` = documento normalizado (só dígitos), `role` = `"CUSTOMER"` |
| Validade do JWT | Curta — default 15 min (`TOKEN_TTL_SECONDS`), token serve só para consultar/aprovar uma OS |

Um cliente `INACTIVE` nunca recebe token — a function responde `403` antes de chamar o assinador.

## Variáveis de ambiente

Ver `.env.example`:

- `BACKEND_BASE_URL` — URL base do backend Java (sem barra final).
- `INTERNAL_API_KEY` — mesma chave configurada em `INTERNAL_API_KEY` no backend.
- `CUSTOMER_JWT_SECRET` — mesmo segredo configurado em `CUSTOMER_JWT_SECRET` no backend.
- `TOKEN_TTL_SECONDS` — validade do token emitido, em segundos (default `900`).

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencher com os mesmos valores do backend
npm run typecheck
npm test
```

## Handler AWS Lambda

`src/handlers/aws/authenticateHandler.ts` espera ser configurado como o handler de uma função Lambda por trás de
um API Gateway (proxy integration), recebendo `POST` com corpo:

```json
{ "document": "12345678909" }
```

Respostas:

| Situação | HTTP | Corpo |
|----------|------|-------|
| Documento ausente/mal formatado no request | 400 | `{"message": "..."}` |
| CPF/CNPJ inválido | 400 | `{"message": "..."}` |
| Cliente não encontrado | 404 | `{"message": "..."}` |
| Cliente inativo | 403 | `{"message": "..."}` |
| Sucesso | 200 | `{"token": "<jwt>"}` |
| Erro inesperado (ex: backend fora do ar) | 500 | `{"message": "..."}` |

## Deploy (Terraform)

A infraestrutura desta function (Lambda + API Gateway) é provisionada pelo Terraform em [`terraform/`](terraform).

### Pré-requisitos

- Terraform >= 1.5.
- Credenciais AWS configuradas (`aws configure` ou variáveis `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_SESSION_TOKEN`).
- Node.js instalado — o próprio `terraform apply` compila e empacota a function antes de subir o zip (ver
  `scripts/build-lambda.js`).

### O que é provisionado

- `aws_lambda_function` (`nodejs22.x`), handler `src/handlers/aws/authenticateHandler.handler`.
- IAM role de execução da Lambda + `AWSLambdaBasicExecutionRole` (permissão de logs).
- Log group no CloudWatch (`/aws/lambda/<function_name>`).
- Uma **HTTP API** (API Gateway v2, `payload_format_version = "1.0"` para bater com o formato
  `APIGatewayProxyEvent` que o handler já espera) com a rota `POST /authenticate`.

O empacotamento (`terraform/build.tf`) roda `npm run build` e monta o zip com `dist/src/**` + `node_modules/jose`
— sem bundler, porque `jose` não tem dependências transitivas. Só reroda quando o código-fonte, o
`package-lock.json` ou o `tsconfig.json` mudam.

### Como rodar

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # preencher com os valores reais — nunca commitar este arquivo
terraform init
terraform plan
terraform apply
```

Ao final, o output `api_endpoint` traz a URL pública (`POST`) que consome o handler.

O state fica **local** por enquanto (sem backend remoto configurado) — serve para uso individual; para trabalho
em equipe/CI, configurar um backend remoto (ex: S3 + DynamoDB) em `terraform/versions.tf`.

### Configuração pendente para um ambiente real (fica para depois)

O que está em `terraform/` hoje é suficiente para provisionar a function num ambiente pessoal/de teste. Antes de
considerar isso pronto para um ambiente real de produção, falta configurar:

- **`aws_region`** — não tem default hoje (variável obrigatória); definir a mesma região onde o resto da infra
  (cluster EKS `oficina-mecnica-lab-cluster`) roda, para manter tudo no mesmo lugar.
- **`backend_base_url`** — hoje é só o placeholder do `terraform.tfvars.example`; precisa apontar para a URL
  pública real do backend `oficina-mvp-java` já implantado (o `LoadBalancer`/domínio do serviço em produção, não
  `localhost`).
- **`internal_api_key` e `customer_jwt_secret`** — precisam ser os mesmos valores reais configurados como
  `Secret` no backend Java em produção (hoje só há placeholder de exemplo). Como ficam em texto puro numa
  variável do Terraform, o ideal é buscar esses valores de um secret manager (AWS Secrets Manager ou SSM
  Parameter Store) em vez de digitá-los direto no `terraform.tfvars`.
- **Backend remoto do state** (S3 + DynamoDB, ou Terraform Cloud) — sem isso, não dá para rodar `terraform
  apply` a partir de um pipeline de CI/CD nem trabalhar em equipe com segurança.
- **CORS na HTTP API** — se algum frontend for chamar `POST /authenticate` direto do navegador, falta configurar
  `cors_configuration` em `aws_apigatewayv2_api`.
- **Rate limiting/throttling** — o endpoint recebe CPF/CNPJ como entrada; sem limite de requisições por IP/chave
  na API Gateway (ou WAF na frente), fica exposto a tentativas de enumeração de documentos.
- **Domínio customizado + certificado ACM** — hoje a URL fica no domínio padrão do API Gateway
  (`*.execute-api.<região>.amazonaws.com`); um domínio próprio é opcional, mas comum em produção.
- **CI/CD** — não existe pipeline neste repositório ainda; hoje o `terraform apply` é manual, rodado localmente.

Nenhum desses pontos é implementado agora — ficam de propósito para quando a configuração de cloud real for
definida.

## Fora de escopo deste repositório (por enquanto)

- Backend remoto do state do Terraform (S3 + DynamoDB) — hoje o state fica local, ver
  [Deploy (Terraform)](#deploy-terraform).
- Empacotamento otimizado para cold start (bundling com esbuild) — o zip inclui `node_modules/jose` sem
  minificação/tree-shaking.
- Handler para outro provedor serverless (a estrutura já deixa espaço em `handlers/`, mas nenhum outro foi
  escrito ainda).
