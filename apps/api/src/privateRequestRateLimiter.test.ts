import { describe, expect, it } from "@jest/globals";
import { PrivateRequestRateLimiter } from "./privateRequestRateLimiter";

describe("PrivateRequestRateLimiter", () => {
  it("isolates profiles and releases requests after the sliding window", () => {
    let now = new Date("2026-07-14T06:00:00.000Z");
    const limiter = new PrivateRequestRateLimiter(1, () => now);

    limiter.assertAllowed("profile-a");
    limiter.assertAllowed("profile-b");
    expect(() => limiter.assertAllowed("profile-a")).toThrow(
      expect.objectContaining({ code: "RATE_LIMITED", status: 429 }),
    );

    now = new Date("2026-07-14T06:01:00.001Z");
    expect(() => limiter.assertAllowed("profile-a")).not.toThrow();
  });
});
