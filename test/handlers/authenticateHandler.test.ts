import type { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../../src/handlers/aws/authenticateHandler";

const fetchStatusMock = jest.fn();
const signMock = jest.fn();

jest.mock("../../src/adapters/customerStatusHttpClient", () => ({
  CustomerStatusHttpClient: jest.fn().mockImplementation(() => ({ fetchStatus: fetchStatusMock })),
}));

jest.mock("../../src/adapters/jwtTokenSigner", () => ({
  JwtTokenSigner: jest.fn().mockImplementation(() => ({ sign: signMock })),
}));

function buildEvent(body: string | null): APIGatewayProxyEvent {
  return { body } as unknown as APIGatewayProxyEvent;
}

describe("authenticateHandler (AWS)", () => {
  beforeEach(() => {
    process.env.BACKEND_BASE_URL = "http://localhost:3000";
    process.env.INTERNAL_API_KEY = "chave-interna-teste";
    process.env.CUSTOMER_JWT_SECRET = "segredo-cliente-teste-segredo-cliente-teste";
    delete process.env.TOKEN_TTL_SECONDS;
  });

  it("returns 400 for a malformed JSON body", async () => {
    const response = await handler(buildEvent("{invalid"));

    expect(response.statusCode).toBe(400);
  });

  it("returns 400 when 'document' is missing", async () => {
    const response = await handler(buildEvent(JSON.stringify({})));

    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for an invalid CPF/CNPJ", async () => {
    const response = await handler(buildEvent(JSON.stringify({ document: "111.111.111-11" })));

    expect(response.statusCode).toBe(400);
  });

  it("returns 404 when the customer does not exist", async () => {
    fetchStatusMock.mockResolvedValue({ found: false, customerId: null, name: null, status: "NOT_FOUND" });

    const response = await handler(buildEvent(JSON.stringify({ document: "529.982.247-25" })));

    expect(response.statusCode).toBe(404);
  });

  it("returns 403 when the customer is inactive", async () => {
    fetchStatusMock.mockResolvedValue({ found: true, customerId: 1, name: "Cliente", status: "INACTIVE" });

    const response = await handler(buildEvent(JSON.stringify({ document: "529.982.247-25" })));

    expect(response.statusCode).toBe(403);
  });

  it("returns 200 with a token when the customer is active", async () => {
    fetchStatusMock.mockResolvedValue({ found: true, customerId: 1, name: "Cliente", status: "ACTIVE" });
    signMock.mockResolvedValue("token-assinado");

    const response = await handler(buildEvent(JSON.stringify({ document: "529.982.247-25" })));

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ token: "token-assinado" });
    expect(signMock).toHaveBeenCalledWith("52998224725");
  });

  it("returns 500 when an unexpected error occurs", async () => {
    fetchStatusMock.mockRejectedValue(new Error("timeout"));

    const response = await handler(buildEvent(JSON.stringify({ document: "529.982.247-25" })));

    expect(response.statusCode).toBe(500);
  });
});
