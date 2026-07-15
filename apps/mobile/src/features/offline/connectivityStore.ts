import { create } from "zustand";

export type ConnectivityStatus = "unknown" | "online" | "offline";

interface ConnectivityState {
  status: ConnectivityStatus;
  setStatus: (status: ConnectivityStatus) => void;
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  status: "unknown",
  setStatus: (status) => set({ status }),
}));

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
