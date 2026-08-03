export class DbUnreachableError extends Error {
  constructor(cause?: unknown) {
    super("The graph database is unreachable");
    this.name = "DbUnreachableError";
    this.cause = cause;
  }
}

export class DbQueryError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "DbQueryError";
    this.cause = cause;
  }
}

const CONNECTIVITY_CODES = [
  "ServiceUnavailable",
  "SessionExpired",
  "Neo.ClientError.Security.AuthenticationRateLimit",
  "Neo.ClientError.Security.Unauthorized",
];

export function isConnectivityError(err: unknown): boolean {
  if (err instanceof DbUnreachableError) return true;
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = String((err as { code: unknown }).code);
    return CONNECTIVITY_CODES.some((c) => code.includes(c));
  }
  return false;
}
