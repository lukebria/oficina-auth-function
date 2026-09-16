import { authenticateByDocument } from "../../src/core/authenticateByDocument";
import { CustomerInactiveError, CustomerNotFoundError, InvalidDocumentError } from "../../src/core/domain/errors";
import { CustomerStatusPort, TokenSignerPort } from "../../src/core/ports";

const VALID_CPF = "529.982.247-25";
const NORMALIZED_CPF = "52998224725";

function buildDeps(overrides?: { customerStatus?: Partial<CustomerStatusPort>; tokenSigner?: Partial<TokenSignerPort> }) {
  const customerStatus: CustomerStatusPort = {
    fetchStatus: jest.fn().mockResolvedValue({
      found: true,
      customerId: 1,
      name: "Cliente Teste",
      status: "ACTIVE",
    }),
    ...overrides?.customerStatus,
  };
  const tokenSigner: TokenSignerPort = {
    sign: jest.fn().mockResolvedValue("token-assinado"),
    ...overrides?.tokenSigner,
  };
  return { customerStatus, tokenSigner };
}

describe("authenticateByDocument", () => {
  it("rejects an invalid document before calling any port", async () => {
    const deps = buildDeps();

    await expect(authenticateByDocument("111.111.111-11", deps)).rejects.toBeInstanceOf(InvalidDocumentError);
    expect(deps.customerStatus.fetchStatus).not.toHaveBeenCalled();
    expect(deps.tokenSigner.sign).not.toHaveBeenCalled();
  });

  it("normalizes the document before querying the customer status port", async () => {
    const deps = buildDeps();

    await authenticateByDocument(VALID_CPF, deps);

    expect(deps.customerStatus.fetchStatus).toHaveBeenCalledWith(NORMALIZED_CPF);
  });

  it("rejects when the customer is not found", async () => {
    const deps = buildDeps({
      customerStatus: {
        fetchStatus: jest.fn().mockResolvedValue({ found: false, customerId: null, name: null, status: "NOT_FOUND" }),
      },
    });

    await expect(authenticateByDocument(VALID_CPF, deps)).rejects.toBeInstanceOf(CustomerNotFoundError);
    expect(deps.tokenSigner.sign).not.toHaveBeenCalled();
  });

  it("rejects when the customer is inactive", async () => {
    const deps = buildDeps({
      customerStatus: {
        fetchStatus: jest.fn().mockResolvedValue({ found: true, customerId: 1, name: "Cliente", status: "INACTIVE" }),
      },
    });

    await expect(authenticateByDocument(VALID_CPF, deps)).rejects.toBeInstanceOf(CustomerInactiveError);
    expect(deps.tokenSigner.sign).not.toHaveBeenCalled();
  });

  it("signs a token with the normalized document when the customer is active", async () => {
    const deps = buildDeps();

    const result = await authenticateByDocument(VALID_CPF, deps);

    expect(deps.tokenSigner.sign).toHaveBeenCalledWith(NORMALIZED_CPF);
    expect(result).toEqual({ token: "token-assinado", customerId: 1 });
  });
});
