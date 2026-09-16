import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { authenticateByDocument } from "../../core/authenticateByDocument";
import { CustomerInactiveError, CustomerNotFoundError, InvalidDocumentError } from "../../core/domain/errors";
import { loadConfig } from "../../adapters/config";
import { CustomerStatusHttpClient } from "../../adapters/customerStatusHttpClient";
import { JwtTokenSigner } from "../../adapters/jwtTokenSigner";

interface AuthenticateRequestBody {
  document?: unknown;
}

function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

/**
 * Adapter fino para AWS Lambda (por trás do API Gateway): converte o evento HTTP em uma chamada ao caso de uso
 * `authenticateByDocument` e o resultado/erro de volta em uma resposta HTTP. Toda a regra de negócio vive em
 * `core/` — trocar de provedor serverless é escrever um novo handler aqui do lado, sem tocar no núcleo.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  let body: AuthenticateRequestBody;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return jsonResponse(400, { message: "Corpo da requisição inválido." });
  }

  if (typeof body.document !== "string" || body.document.trim() === "") {
    return jsonResponse(400, { message: "Campo 'document' é obrigatório." });
  }

  const config = loadConfig();
  const customerStatus = new CustomerStatusHttpClient(config);
  const tokenSigner = new JwtTokenSigner(config);

  try {
    const result = await authenticateByDocument(body.document, { customerStatus, tokenSigner });
    return jsonResponse(200, { token: result.token });
  } catch (error) {
    if (error instanceof InvalidDocumentError) return jsonResponse(400, { message: error.message });
    if (error instanceof CustomerNotFoundError) return jsonResponse(404, { message: error.message });
    if (error instanceof CustomerInactiveError) return jsonResponse(403, { message: error.message });

    console.error("Falha inesperada ao autenticar por CPF/CNPJ.", error);
    return jsonResponse(500, { message: "Erro interno ao autenticar." });
  }
}
