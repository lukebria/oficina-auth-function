import { CustomerInactiveError, CustomerNotFoundError, InvalidDocumentError } from "./domain/errors";
import { normalize, isValidCpfOrCnpj } from "./documentValidator";
import { CustomerStatusPort, TokenSignerPort } from "./ports";

export interface AuthenticateByDocumentDeps {
  customerStatus: CustomerStatusPort;
  tokenSigner: TokenSignerPort;
}

export interface AuthenticateByDocumentResult {
  token: string;
  customerId: number;
}

/**
 * Caso de uso central da function: valida o documento, confirma existência/status do cliente no backend
 * oficina-mvp-java e emite o token do fluxo público. Não conhece AWS, HTTP nem a lib de JWT usada — só as portas.
 */
export async function authenticateByDocument(
  rawDocument: string,
  { customerStatus, tokenSigner }: AuthenticateByDocumentDeps
): Promise<AuthenticateByDocumentResult> {
  const document = normalize(rawDocument);
  if (!isValidCpfOrCnpj(document)) {
    throw new InvalidDocumentError(rawDocument ?? "");
  }

  const result = await customerStatus.fetchStatus(document);
  if (!result.found || result.status === "NOT_FOUND" || result.customerId === null) {
    throw new CustomerNotFoundError();
  }
  if (result.status === "INACTIVE") {
    throw new CustomerInactiveError();
  }

  const token = await tokenSigner.sign(document);
  return { token, customerId: result.customerId };
}
