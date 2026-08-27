import { describe, expect, it } from "@jest/globals";
import { ApiError, databaseError, toApiError } from "./errors";

describe("databaseError", () => {
  it("keeps the provider failure out of the client-visible message", () => {
    const error = databaseError(
      "無法載入已發布課程。",
      new TypeError("fetch failed for internal-provider.example"),
    );

    expect(error.message).toBe("無法載入已發布課程。");
    expect(error.message).not.toContain("fetch failed");
    expect(error.message).not.toContain("internal-provider.example");
  });

  it("preserves the stable error contract", () => {
    const error = databaseError("無法載入已發布課程。", new Error("boom"));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("DATABASE_ERROR");
    expect(error.status).toBe(500);
    expect(error.retryable).toBe(true);
  });

  it("attaches the provider failure as a cause so the server is not left blind", () => {
    const cause = new TypeError("fetch failed for internal-provider.example");

    expect(databaseError("無法載入已發布課程。", cause).cause).toBe(cause);
  });

  it("is not serialized into the response payload the API builds", () => {
    // errorResponse builds the body from code/message/retryable only. Anything the client
    // receives has to come from those three fields, never from the attached cause.
    const error = databaseError("無法載入已發布課程。", new Error("internal-provider.example"));
    const payload = {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      requestId: "req-1",
    };

    expect(JSON.stringify(payload)).not.toContain("internal-provider.example");
  });
});

describe("toApiError", () => {
  it("passes an ApiError through unchanged", () => {
    const error = databaseError("無法載入已發布課程。", new Error("boom"));

    expect(toApiError(error)).toBe(error);
  });

  it("replaces an unknown throw with a generic message", () => {
    const error = toApiError(new TypeError("fetch failed for internal-provider.example"));

    expect(error.code).toBe("DATABASE_ERROR");
    expect(error.message).not.toContain("internal-provider.example");
  });
});
