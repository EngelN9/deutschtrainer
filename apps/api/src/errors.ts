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
  | "AUDIO_UPLOAD_FAILED"
  | "CONTENT_NOT_PUBLISHED";

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError("DATABASE_ERROR", "服務暫時無法完成要求。", 500, true);
}
