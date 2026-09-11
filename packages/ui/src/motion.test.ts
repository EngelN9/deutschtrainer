import { durationTokens, resolveDuration } from "./motion";

describe("resolveDuration", () => {
  it("returns the token duration when motion is allowed", () => {
    expect(resolveDuration("base", false)).toBe(durationTokens.base);
    expect(resolveDuration("celebrate", false)).toBe(durationTokens.celebrate);
  });

  it("collapses every duration to zero when reduce motion is enabled", () => {
    for (const token of Object.keys(durationTokens) as (keyof typeof durationTokens)[]) {
      expect(resolveDuration(token, true)).toBe(0);
    }
  });
});
