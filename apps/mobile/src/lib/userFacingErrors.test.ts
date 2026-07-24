import { describe, expect, it } from "@jest/globals";
import { sanitizeUserFacingText, toUserFacingError } from "./userFacingErrors";

describe("user-facing error translation", () => {
  it("preserves API messages that already follow the public error contract", () => {
    const error = new Error("登入狀態已失效，請重新登入。");
    error.name = "ApiClientError";

    expect(toUserFacingError(error)).toBe("登入狀態已失效，請重新登入。");
  });

  it("translates known authentication failures", () => {
    expect(toUserFacingError(new Error("Invalid login credentials"))).toBe(
      "電子郵件或密碼不正確。",
    );
  });

  it("never exposes raw platform messages or URLs", () => {
    expect(toUserFacingError(new Error("java.net.ConnectException https://internal.example"))).toBe(
      "操作暫時無法完成，請稍後再試。",
    );
  });

  it("guards shared error-rendering components from technical strings", () => {
    expect(sanitizeUserFacingText("無法連線：https://internal.example")).toBe(
      "操作暫時無法完成，請稍後再試。",
    );
    expect(sanitizeUserFacingText("課程暫時無法載入，請稍後再試。")).toBe(
      "課程暫時無法載入，請稍後再試。",
    );
  });
});
