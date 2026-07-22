type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

function serializeError(error: unknown): LogFields {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    };
  }

  return { error: String(error) };
}

export function createLogger(component: string) {
  function write(level: LogLevel, message: string, fields: LogFields = {}) {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      ...fields,
    });

    if (level === "error") {
      console.error(entry);
      return;
    }

    console.log(entry);
  }

  return {
    info: (message: string, fields?: LogFields) =>
      write("info", message, fields),
    warn: (message: string, fields?: LogFields) =>
      write("warn", message, fields),
    error: (message: string, error: unknown, fields?: LogFields) =>
      write("error", message, { ...fields, ...serializeError(error) }),
  };
}
