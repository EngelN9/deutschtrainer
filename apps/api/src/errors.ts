export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "DATABASE_ERROR"
  | "AI_TIMEOUT"
  | "AI_RESPONSE_INVALID"
  | "AI_NOT_CONFIGURED"
  | "AI_QUOTA_EXCEEDED"
  | "AI_GLOBALLY_DISABLED"
  | "CLASSROOM_DISABLED"
  | "CLASSROOM_NOT_CONFIGURED"
  | "CLASSROOM_ACCESS_RESTRICTED"
  | "CLASSROOM_PROVIDER_ERROR"
  | "CONFLICT"
  | "AUDIO_UPLOAD_FAILED"
  | "CONTENT_NOT_PUBLISHED";

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number,
    readonly retryable: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ApiError";
  }
}

/**
 * Database failures must never carry the provider's own exception text into `message`:
 * `errorResponse` copies `message` straight into the response body, and `GET /courses` is
 * public, so interpolating `error.message` published internal fetch failures and the provider
 * host to unauthenticated callers.
 *
 * The provider error is attached as the standard `cause` instead. It stays reachable for
 * server-side diagnostics without being serialized — the response is built from `code`,
 * `message`, and `retryable` only.
 */
export function databaseError(message: string, cause: unknown): ApiError {
  return new ApiError("DATABASE_ERROR", message, 500, true, { cause });
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError("DATABASE_ERROR", "服務暫時無法完成要求。", 500, true);
}
