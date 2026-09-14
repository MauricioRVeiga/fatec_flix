type LogLevel = "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

const SENSITIVE_KEYS = [
  "service_role",
  "serviceRoleKey",
  "service_role_key",
  "cron_secret",
  "cronSecret",
  "token",
  "password",
  "connection_string",
  "connectionString",
];

function sanitize(context: LogContext): LogContext {
  const sanitized: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    const isSensitive = SENSITIVE_KEYS.some((sensitiveKey) =>
      key.toLowerCase().includes(sensitiveKey.toLowerCase())
    );

    sanitized[key] = isSensitive ? "[REDACTED]" : value;
  }

  return sanitized;
}

function write(level: LogLevel, event: string, context: LogContext = {}) {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...sanitize(context),
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
  error: (event: string, context?: LogContext) => write("error", event, context),
};
