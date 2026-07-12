export function toUserFacingError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "操作暫時無法完成，請稍後再試。";
}
