import { jwtVerify } from "jose";
import { JwtTokenSigner } from "../../src/adapters/jwtTokenSigner";

describe("JwtTokenSigner", () => {
  const secret = "segredo-de-teste-com-pelo-menos-32-caracteres";

  it("signs a token with sub, role, iss and expiration matching the configured TTL", async () => {
    const signer = new JwtTokenSigner({
      customerJwtSecret: secret,
      tokenTtlSeconds: 900,
      customerJwtIssuer: "customer-app",
    });

    const token = await signer.sign("52998224725");
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));

    expect(payload.sub).toBe("52998224725");
    expect(payload.role).toBe("CUSTOMER");
    expect(payload.iss).toBe("customer-app");
    expect(payload.exp).toBeDefined();
    expect(payload.iat).toBeDefined();
    expect(payload.exp! - payload.iat!).toBe(900);
  });

  it("uses the issuer passed in config, not a hardcoded value", async () => {
    const signer = new JwtTokenSigner({
      customerJwtSecret: secret,
      tokenTtlSeconds: 900,
      customerJwtIssuer: "outro-consumer",
    });

    const token = await signer.sign("52998224725");
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));

    expect(payload.iss).toBe("outro-consumer");
  });
});
