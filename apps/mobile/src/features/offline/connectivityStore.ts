import { create } from "zustand";

export type ConnectivityStatus = "unknown" | "online" | "offline";

interface ConnectivityState {
  status: ConnectivityStatus;
  waking: boolean;
  setStatus: (status: ConnectivityStatus) => void;
  setWaking: (waking: boolean) => void;
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  status: "unknown",
  waking: false,
  setStatus: (status) => set({ status }),
  setWaking: (waking) => set({ waking }),
}));

/**
 * The API runs on a free instance that sleeps, so the first request after an idle period can take
 * 30-50 seconds. A spinner that long reads as a broken app, so anything still in flight after this
 * threshold is reported as a wake-up rather than left silent.
 */
const WAKING_THRESHOLD_MS = 3_000;

let inFlightRequests = 0;
let wakingTimer: ReturnType<typeof setTimeout> | undefined;

export function beginServiceRequest(): void {
  inFlightRequests += 1;

  if (inFlightRequests === 1 && !wakingTimer) {
    wakingTimer = setTimeout(() => {
      wakingTimer = undefined;
      useConnectivityStore.getState().setWaking(true);
    }, WAKING_THRESHOLD_MS);
  }
}

export function endServiceRequest(): void {
  inFlightRequests = Math.max(0, inFlightRequests - 1);

  if (inFlightRequests > 0) {
    return;
  }

  if (wakingTimer) {
    clearTimeout(wakingTimer);
    wakingTimer = undefined;
  }

  useConnectivityStore.getState().setWaking(false);
}

export function connectivityStatusFromState(state: {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}): ConnectivityStatus {
  if (state.isConnected === false || state.isInternetReachable === false) {
    return "offline";
  }
  if (state.isConnected === true) {
    return "online";
  }
  return "unknown";
}

export function markConnectivityOnline(): void {
  useConnectivityStore.getState().setStatus("online");
}

export function markConnectivityOffline(): void {
  useConnectivityStore.getState().setStatus("offline");
}
