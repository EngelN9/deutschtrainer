export function toUserFacingError(error: unknown): string {
  if (
    error instanceof Error &&
    error.name === "ApiClientError" &&
    error.message.trim().length > 0
  ) {
    return sanitizeUserFacingText(error.message);
  }

  if (error instanceof Error) {
    const authMessage = translateAuthenticationError(error.message);
    if (authMessage) {
      return authMessage;
    }
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn("DeutschTrainer operation failed.", {
        name: error.name,
        message: sanitizeDiagnosticMessage(error.message),
      });
    }
  }

  return "操作暫時無法完成，請稍後再試。";
}

export function sanitizeUserFacingText(message: string): string {
  const normalized = message.trim();
  const unsafePattern =
    /https?:\/\/|(?:[A-Za-z]:\\|\/Users\/|\/home\/)|\b(?:java\.|exception|stack trace|sqlstate|postgres|supabase|bearer)\b/i;
  if (
    !normalized ||
    normalized.length > 300 ||
    !/[\u3400-\u9fff]/u.test(normalized) ||
    unsafePattern.test(normalized)
  ) {
    return "操作暫時無法完成，請稍後再試。";
  }
  return normalized;
}

function translateAuthenticationError(message: string): string | undefined {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "電子郵件或密碼不正確。";
  }
  if (normalized.includes("email not confirmed")) {
    return "請先完成電子郵件驗證，再重新登入。";
  }
  if (normalized.includes("user already registered")) {
    return "此電子郵件已註冊，請直接登入。";
  }
  if (normalized.includes("password should be at least")) {
    return "密碼長度不足，請依畫面要求重新設定。";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "操作過於頻繁，請稍後再試。";
  }
  return undefined;
}

function sanitizeDiagnosticMessage(message: string): string {
  return message
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/[A-Za-z]:\\[^\s]+/g, "[path]")
    .slice(0, 240);
}
