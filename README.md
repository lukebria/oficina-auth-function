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

## Fora de escopo deste repositório (por enquanto)

- Infra como código para o deploy (SAM/CDK/Serverless Framework/Terraform) e o provisionamento do próprio API
  Gateway — este repositório só contém o código da function e como testá-la localmente.
- Empacotamento otimizado para cold start (bundling com esbuild).
- Handler para outro provedor serverless (a estrutura já deixa espaço em `handlers/`, mas nenhum outro foi
  escrito ainda).
