import { SignJWT } from "jose";
import { TokenSignerPort } from "../core/ports";
import { AppConfig } from "./config";

/**
 * Implementa `TokenSignerPort` assinando HS256 com `CUSTOMER_JWT_SECRET` — o mesmo segredo dedicado configurado
 * no backend oficina-mvp-java (`app.jwt.customer-secret`) e no Kong (`oficina-mvp-infra-iac`, ADR-006),
 * diferente do segredo do login administrativo. Claims: `sub` = documento normalizado, `role` = "CUSTOMER",
 * `iss` = identificador do consumer no Kong — contrato documentado em docs/architecture.md (seção 5.3) do
 * backend e em ADR-006 (validação do JWT de cliente no API Gateway).
 */
export class JwtTokenSigner implements TokenSignerPort {
  private readonly secretKey: Uint8Array;
  private readonly ttlSeconds: number;
  private readonly issuer: string;

  constructor(config: Pick<AppConfig, "customerJwtSecret" | "tokenTtlSeconds" | "customerJwtIssuer">) {
    this.secretKey = new TextEncoder().encode(config.customerJwtSecret);
    this.ttlSeconds = config.tokenTtlSeconds;
    this.issuer = config.customerJwtIssuer;
  }

  async sign(document: string): Promise<string> {
    const issuedAt = Math.floor(Date.now() / 1000);
    return new SignJWT({ role: "CUSTOMER" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(document)
      .setIssuer(this.issuer)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + this.ttlSeconds)
      .sign(this.secretKey);
  }
}
