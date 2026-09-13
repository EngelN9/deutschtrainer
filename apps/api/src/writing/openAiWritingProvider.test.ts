import { describe, expect, it } from "@jest/globals";
import { classifyOpenAiError } from "./openAiWritingProvider";

describe("OpenAI writing provider errors", () => {
  it.each([{ message: "Request timed out after 20000ms" }, { cause: { code: "ETIMEDOUT" } }])(
    "classifies provider timeouts as AI_TIMEOUT",
    (error) => {
      const classified = classifyOpenAiError(error);

      expect(classified.code).toBe("AI_TIMEOUT");
      expect(classified.retryable).toBe(true);
    },
  );
});
