import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { authenticateByDocument } from "../../core/authenticateByDocument";
import { CustomerInactiveError, CustomerNotFoundError, InvalidDocumentError } from "../../core/domain/errors";
import { loadConfig } from "../../adapters/config";
import { CustomerStatusHttpClient } from "../../adapters/customerStatusHttpClient";
import { JwtTokenSigner } from "../../adapters/jwtTokenSigner";
import { createLogger } from "../../adapters/logger";

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
  const requestId = event.requestContext?.requestId ?? "unknown";
  const logger = createLogger(requestId);

  let body: AuthenticateRequestBody;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    logger.warn("Corpo da requisição inválido (JSON malformado).");
    return jsonResponse(400, { message: "Corpo da requisição inválido." });
  }

  if (typeof body.document !== "string" || body.document.trim() === "") {
    logger.warn("Campo 'document' ausente ou vazio.");
    return jsonResponse(400, { message: "Campo 'document' é obrigatório." });
  }

  const config = loadConfig();
  const customerStatus = new CustomerStatusHttpClient(config);
  const tokenSigner = new JwtTokenSigner(config);

  try {
    const result = await authenticateByDocument(body.document, { customerStatus, tokenSigner });
    logger.info("Autenticação concluída com sucesso.", { customerId: result.customerId });
    return jsonResponse(200, { token: result.token });
  } catch (error) {
    if (error instanceof InvalidDocumentError) {
      logger.warn("Documento inválido.");
      return jsonResponse(400, { message: error.message });
    }
    if (error instanceof CustomerNotFoundError) {
      logger.warn("Cliente não encontrado para o documento informado.");
      return jsonResponse(404, { message: error.message });
    }
    if (error instanceof CustomerInactiveError) {
      logger.warn("Cliente inativo.");
      return jsonResponse(403, { message: error.message });
    }

    logger.error("Falha inesperada ao autenticar por CPF/CNPJ.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse(500, { message: "Erro interno ao autenticar." });
  }
}
