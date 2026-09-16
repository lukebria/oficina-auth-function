import { SignJWT } from "jose";
import { TokenSignerPort } from "../core/ports";
import { AppConfig } from "./config";

/**
 * Implementa `TokenSignerPort` assinando HS256 com `CUSTOMER_JWT_SECRET` — o mesmo segredo dedicado configurado
 * no backend oficina-mvp-java (`app.jwt.customer-secret`), diferente do segredo do login administrativo. Claims:
 * `sub` = documento normalizado, `role` = "CUSTOMER" — contrato documentado em docs/architecture.md (seção 5.3)
 * do backend.
 */
export class JwtTokenSigner implements TokenSignerPort {
  private readonly secretKey: Uint8Array;
  private readonly ttlSeconds: number;

  constructor(config: Pick<AppConfig, "customerJwtSecret" | "tokenTtlSeconds">) {
    this.secretKey = new TextEncoder().encode(config.customerJwtSecret);
    this.ttlSeconds = config.tokenTtlSeconds;
  }

  async sign(document: string): Promise<string> {
    const issuedAt = Math.floor(Date.now() / 1000);
    return new SignJWT({ role: "CUSTOMER" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(document)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + this.ttlSeconds)
      .sign(this.secretKey);
  }
}
