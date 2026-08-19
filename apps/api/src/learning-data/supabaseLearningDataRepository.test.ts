import { describe, expect, it } from "@jest/globals";
import { createSafeDatabaseError } from "./supabaseLearningDataRepository";

describe("SupabaseLearningDataRepository error sanitization", () => {
  it("does not expose the underlying provider failure", () => {
    const error = createSafeDatabaseError(
      "無法載入已發布課程。",
      new TypeError("fetch failed for internal-provider.example"),
    );

    expect(error).toMatchObject({
      code: "DATABASE_ERROR",
      message: "無法載入已發布課程。",
      status: 500,
      retryable: true,
    });
    expect(error.message).not.toContain("fetch failed");
    expect(error.message).not.toContain("internal-provider.example");
  });
});
