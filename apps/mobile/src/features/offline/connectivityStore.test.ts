import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  beginServiceRequest,
  connectivityStatusFromState,
  endServiceRequest,
  useConnectivityStore,
} from "./connectivityStore";

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

describe("service wake-up reporting", () => {
  const waking = () => useConnectivityStore.getState().waking;

  beforeEach(() => {
    jest.useFakeTimers();
    useConnectivityStore.getState().setWaking(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("stays silent for a request that answers quickly", () => {
    beginServiceRequest();
    jest.advanceTimersByTime(2_500);
    endServiceRequest();
    jest.advanceTimersByTime(10_000);

    expect(waking()).toBe(false);
  });

  it("reports a wake-up once a request outlives the threshold", () => {
    beginServiceRequest();
    expect(waking()).toBe(false);

    jest.advanceTimersByTime(3_000);
    expect(waking()).toBe(true);

    endServiceRequest();
    expect(waking()).toBe(false);
  });

  it("keeps reporting until the last concurrent request settles", () => {
    beginServiceRequest();
    beginServiceRequest();
    jest.advanceTimersByTime(3_000);
    expect(waking()).toBe(true);

    endServiceRequest();
    expect(waking()).toBe(true);

    endServiceRequest();
    expect(waking()).toBe(false);
  });

  it("does not go negative when more requests end than began", () => {
    endServiceRequest();
    endServiceRequest();

    beginServiceRequest();
    jest.advanceTimersByTime(3_000);
    expect(waking()).toBe(true);

    endServiceRequest();
    expect(waking()).toBe(false);
  });
});
