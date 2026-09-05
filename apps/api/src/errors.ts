import type { z } from "zod";
import { apiErrorCodeSchema } from "@deutschtrainer/validation";

// Derived, not duplicated: the hand-written union drifted from apiErrorCodeSchema once already
// (CLASSROOM_SESSION_LIMIT was added here but not there, so the 429 refusal failed client-side
// response validation). Inferring makes that class of drift impossible.
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

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
