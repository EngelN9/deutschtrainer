import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { CloudUpload, RefreshCw, WifiOff } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { useAuthStore } from "../auth/useAuthStore";
import { useConnectivityStore } from "./connectivityStore";
import { useOfflineStore } from "./useOfflineStore";

export function OfflineStatusBand() {
  const router = useRouter();
  const profileId = useAuthStore((state) => state.profile?.id);
  const connectivity = useConnectivityStore((state) => state.status);
  const syncStatus = useOfflineStore((state) => state.syncStatus);
  const pendingCount = useOfflineStore((state) =>
    profileId ? Object.keys(state.profiles[profileId]?.pendingAttempts ?? {}).length : 0,
  );

  if (connectivity !== "offline" && pendingCount === 0 && syncStatus !== "syncing") {
    return null;
  }

  const Icon =
    connectivity === "offline" ? WifiOff : syncStatus === "syncing" ? RefreshCw : CloudUpload;
  const title =
    connectivity === "offline"
      ? "目前離線"
      : syncStatus === "syncing"
        ? "正在同步作答"
        : "有待同步作答";
  const detail = pendingCount > 0 ? `${pendingCount} 筆作答保存在裝置` : "已下載課程仍可繼續學習";

  return (
    <Pressable
      accessibilityLabel={`${title}，${detail}，開啟離線管理`}
      accessibilityRole="button"
      onPress={() => router.push("/offline" as Href)}
      style={({ pressed }) => [styles.band, pressed ? styles.pressed : null]}
    >
      <Icon
        color={connectivity === "offline" ? colorTokens.warning : colorTokens.primary}
        size={21}
      />
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <Text style={styles.action}>管理</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    color: colorTokens.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  band: {
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.md,
    minHeight: 64,
    padding: spacingTokens.md,
  },
  copy: {
    flex: 1,
    gap: spacingTokens.xs,
  },
  detail: {
    color: colorTokens.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.72,
  },
  title: {
    color: colorTokens.text,
    fontSize: 15,
    fontWeight: "800",
  },
});
