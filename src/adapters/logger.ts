type LogLevel = "info" | "warn" | "error";

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

function write(level: LogLevel, requestId: string, message: string, meta?: Record<string, unknown>): void {
  const entry = {
    level,
    message,
    requestId,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  const line = JSON.stringify(entry);
  // eslint-disable-next-line no-console
  if (level === "error") console.error(line);
  else console.log(line);
}

/**
 * Logger estruturado (JSON), correlacionado pelo requestId do API Gateway — cada linha vira um objeto no
 * CloudWatch Logs, permitindo filtrar/agrupar por requestId (ver README, seção "Observabilidade").
 * Nunca logar o documento (CPF/CNPJ) em texto puro — é dado sensível do cliente.
 */
export function createLogger(requestId: string): Logger {
  return {
    info: (message, meta) => write("info", requestId, message, meta),
    warn: (message, meta) => write("warn", requestId, message, meta),
    error: (message, meta) => write("error", requestId, message, meta),
  };
}
