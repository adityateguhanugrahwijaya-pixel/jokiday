const SENSITIVE_KEYS = new Set([
  "password",
  "password_hash",
  "passwordHash",
  "token",
  "refresh_token",
  "refreshToken",
  "secret",
  "key",
  "apiKey",
  "authorization",
  "destination",
]);

function sanitize(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key) || key.toLowerCase().includes("secret") || key.toLowerCase().includes("pass")) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export const logger = {
  info: (message: string, context?: unknown) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, context ? sanitize(context) : "");
  },
  warn: (message: string, context?: unknown) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, context ? sanitize(context) : "");
  },
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error instanceof Error ? error.stack : sanitize(error));
  },
};
