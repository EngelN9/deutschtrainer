import { randomUUID } from "node:crypto";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,100}$/u;

export interface HttpRequestLogInput {
  requestId: string;
  method: string;
  pathname: string;
  status: number;
  durationMs: number;
}

export interface HttpRequestLogEntry extends HttpRequestLogInput {
  level: "info" | "error";
  event: "http_request";
}

export function resolveRequestId(
  candidate: string | null | undefined,
  generate: () => string = randomUUID,
): string {
  const normalized = candidate?.trim();
  return normalized && REQUEST_ID_PATTERN.test(normalized) ? normalized : generate();
}

export function createHttpRequestLog(input: HttpRequestLogInput): HttpRequestLogEntry {
  return {
    level: input.status >= 500 ? "error" : "info",
    event: "http_request",
    ...input,
    durationMs: Math.max(0, Math.round(input.durationMs)),
  };
}
