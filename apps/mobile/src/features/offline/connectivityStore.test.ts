import { describe, expect, it } from "@jest/globals";
import { connectivityStatusFromState } from "./connectivityStore";

describe("connectivityStatusFromState", () => {
  it("maps native connectivity signals", () => {
    expect(connectivityStatusFromState({ isConnected: false, isInternetReachable: null })).toBe(
      "offline",
    );
    expect(connectivityStatusFromState({ isConnected: true, isInternetReachable: false })).toBe(
      "offline",
    );
    expect(connectivityStatusFromState({ isConnected: true, isInternetReachable: true })).toBe(
      "online",
    );
    expect(connectivityStatusFromState({ isConnected: true, isInternetReachable: null })).toBe(
      "online",
    );
    expect(connectivityStatusFromState({ isConnected: null, isInternetReachable: null })).toBe(
      "unknown",
    );
  });
});
