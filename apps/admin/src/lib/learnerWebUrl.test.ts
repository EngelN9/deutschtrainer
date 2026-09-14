import { afterEach, describe, expect, it } from "@jest/globals";
import { fallbackLearnerWebUrl, getLearnerWebUrl } from "./learnerWebUrl";

describe("getLearnerWebUrl", () => {
  const originalValue = process.env.NEXT_PUBLIC_LEARNER_WEB_URL;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.NEXT_PUBLIC_LEARNER_WEB_URL;
    } else {
      process.env.NEXT_PUBLIC_LEARNER_WEB_URL = originalValue;
    }
  });

  it("uses the configured learner URL after trimming whitespace", () => {
    process.env.NEXT_PUBLIC_LEARNER_WEB_URL = "  https://app.deutschtrainer.app  ";
    expect(getLearnerWebUrl()).toBe("https://app.deutschtrainer.app");
  });

  it("uses the Render fallback when no URL is configured", () => {
    delete process.env.NEXT_PUBLIC_LEARNER_WEB_URL;
    expect(getLearnerWebUrl()).toBe(fallbackLearnerWebUrl);
  });
});
