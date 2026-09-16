import { CustomerStatusPort, CustomerStatusResult } from "../core/ports";
import { AppConfig } from "./config";

/**
 * Implementa `CustomerStatusPort` chamando `GET /api/internal/customers/{document}` no backend oficina-mvp-java,
 * autenticado por `X-Internal-Api-Key` (não é o mesmo mecanismo do JWT que esta function emite) — ver
 * docs/architecture.md (seção 5) do backend para o contrato completo. Usa o `fetch` global do Node — sem
 * dependência extra de HTTP client.
 */
export class CustomerStatusHttpClient implements CustomerStatusPort {
  constructor(private readonly config: Pick<AppConfig, "backendBaseUrl" | "internalApiKey">) {}

  async fetchStatus(document: string): Promise<CustomerStatusResult> {
    const response = await fetch(`${this.config.backendBaseUrl}/api/internal/customers/${document}`, {
      method: "GET",
      headers: { "X-Internal-Api-Key": this.config.internalApiKey },
    });

    if (response.status !== 200 && response.status !== 404) {
      throw new Error(`Falha ao consultar status do cliente no backend (HTTP ${response.status}).`);
    }

    return (await response.json()) as CustomerStatusResult;
  }
}
