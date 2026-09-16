/**
 * Portas do núcleo (sem dependência de AWS, HTTP ou lib de JWT específica) — ver README para o desenho em
 * camadas. Um handler para outro provedor serverless só precisa fornecer implementações destas interfaces.
 */

export type CustomerStatusValue = "ACTIVE" | "INACTIVE" | "NOT_FOUND";

export interface CustomerStatusResult {
  found: boolean;
  customerId: number | null;
  name: string | null;
  status: CustomerStatusValue;
}

export interface CustomerStatusPort {
  fetchStatus(document: string): Promise<CustomerStatusResult>;
}

export interface TokenSignerPort {
  sign(document: string): Promise<string>;
}
