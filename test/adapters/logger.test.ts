import { createLogger } from "../../src/adapters/logger";

describe("createLogger", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("writes info/warn as a single JSON line via console.log, with level/message/requestId/timestamp", () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const logger = createLogger("req-123");

    logger.info("mensagem de teste", { customerId: 42 });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(entry).toMatchObject({
      level: "info",
      message: "mensagem de teste",
      requestId: "req-123",
      customerId: 42,
    });
    expect(typeof entry.timestamp).toBe("string");
  });

  it("writes error via console.error, not console.log", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const logger = createLogger("req-456");

    logger.error("falha inesperada", { error: "timeout" });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
    const entry = JSON.parse(errorSpy.mock.calls[0]![0] as string);
    expect(entry).toMatchObject({ level: "error", message: "falha inesperada", requestId: "req-456" });
  });
});
