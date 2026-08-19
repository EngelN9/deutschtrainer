import { mobileEnv } from "../../lib/env";

export const CONNECTED_AUTH_UNAVAILABLE_MESSAGE =
  "此 Preview APK 不連接雲端。若要使用正式帳號，請安裝 Staging 連線版。";

export function assertConnectedAuthEnabled(): void {
  if (!mobileEnv.supportsConnectedAuth) {
    throw new Error(CONNECTED_AUTH_UNAVAILABLE_MESSAGE);
  }
}
