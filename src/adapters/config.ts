export interface AppConfig {
  backendBaseUrl: string;
  internalApiKey: string;
  customerJwtSecret: string;
  customerJwtIssuer: string;
  tokenTtlSeconds: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória não configurada: ${name}`);
  }
  return value;
}

/** Lê e valida as variáveis de ambiente do contrato com o backend oficina-mvp-java — ver .env.example. */
export function loadConfig(): AppConfig {
  return {
    backendBaseUrl: requireEnv("BACKEND_BASE_URL").replace(/\/+$/, ""),
    internalApiKey: requireEnv("INTERNAL_API_KEY"),
    customerJwtSecret: requireEnv("CUSTOMER_JWT_SECRET"),
    // Claim "iss" do token - o Kong (API Gateway da aplicação principal) usa esse valor para casar o token com
    // o KongConsumer/credential JWT configurado em oficina-mvp-infra-iac (ADR-006). Precisa ser o mesmo valor
    // dos dois lados.
    customerJwtIssuer: process.env.CUSTOMER_JWT_ISSUER ?? "customer-app",
    tokenTtlSeconds: process.env.TOKEN_TTL_SECONDS ? Number(process.env.TOKEN_TTL_SECONDS) : 900,
  };
}
