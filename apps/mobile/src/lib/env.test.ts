import { describe, expect, it } from "@jest/globals";
import { getMobileCapabilities } from "./env";

describe("mobile build capabilities", () => {
  it("keeps the mock Preview offline-only", () => {
    expect(getMobileCapabilities("mock")).toEqual({
      supportsConnectedAuth: false,
      supportsOfflineDemo: true,
    });
  });

  it("keeps the API Staging build connected-only", () => {
    expect(getMobileCapabilities("api")).toEqual({
      supportsConnectedAuth: true,
      supportsOfflineDemo: false,
    });
  });
});
