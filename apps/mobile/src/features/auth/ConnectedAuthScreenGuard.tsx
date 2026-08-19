import type { PropsWithChildren } from "react";
import { AppScreen } from "../../components/AppScreen";
import { AuthLink } from "../../components/AuthLink";
import { MessageBanner } from "../../components/MessageBanner";
import { mobileEnv } from "../../lib/env";
import { CONNECTED_AUTH_UNAVAILABLE_MESSAGE } from "./authCapabilities";

export function ConnectedAuthScreenGuard({ children }: PropsWithChildren) {
  if (mobileEnv.supportsConnectedAuth) {
    return children;
  }

  return (
    <AppScreen
      description="離線 Demo 與正式連線帳號採用不同的內部分發版本。"
      eyebrow="離線 Preview"
      title="此版本未開放帳號登入"
    >
      <MessageBanner message={CONNECTED_AUTH_UNAVAILABLE_MESSAGE} tone="info" />
      <AuthLink href="/welcome">返回離線 Demo</AuthLink>
    </AppScreen>
  );
}
