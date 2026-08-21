import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import {
  BarChart3,
  ChevronRight,
  CloudOff,
  Headphones,
  Library,
  Settings,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, radiusTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../src/features/auth/AuthGate";
import { useAuthStore } from "../src/features/auth/useAuthStore";
import { ContentScreen } from "../src/components/ContentScreen";
import { MessageBanner } from "../src/components/MessageBanner";
import { SectionHeader, StatusBadge, SurfaceCard } from "../src/components/UiPrimitives";
import { getMoreCapabilities, type Capability } from "../src/navigation/navigationPolicy";

const icons: Partial<Record<Capability, LucideIcon>> = {
  analytics: BarChart3,
  audio: Headphones,
  knowledge: Library,
  offline: CloudOff,
  settings: Settings,
};

const descriptions: Partial<Record<Capability, string>> = {
  analytics: "查看活動、技能與複習趨勢，不把單一分數當作學習成效。",
  audio: "練習已啟用的聽力、錄音與文字比較功能。",
  knowledge: "搜尋文法、詞彙與常見錯誤的繁體中文說明。",
  offline: "管理已下載課程、待同步作答與連線狀態。",
  settings: "調整程度、提醒、隱私資料與帳號選項。",
};

export default function MoreScreen() {
  const router = useRouter();
  const authMode = useAuthStore((state) => state.authMode);
  const items = getMoreCapabilities(authMode);

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description="把較少使用的工具集中在一處，讓今日、課程、寫作與複習保持簡單。"
        eyebrow="功能中心"
        showMainNavigation
        title="更多"
      >
        <MessageBanner
          message={
            authMode === "demo"
              ? "離線 Demo 只顯示本機可用功能；需要帳號、雲端或 AI 的項目不會以假結果代替。"
              : null
          }
          tone="info"
        />
        <SectionHeader
          description="此處只列出目前帳號模式真正可使用的功能。"
          eyebrow="Tools"
          title="學習工具與設定"
        />
        <View style={styles.grid}>
          {items.map((item) => {
            const Icon = icons[item.capability] ?? Settings;
            return (
              <Pressable
                accessibilityLabel={`開啟${item.label}`}
                accessibilityRole="button"
                key={item.capability}
                onPress={() => router.push(item.href as Href)}
                style={({ pressed }) => [styles.pressable, pressed ? styles.pressed : null]}
              >
                <SurfaceCard style={styles.card}>
                  <View style={styles.iconWrap}>
                    <Icon color={colorTokens.primary} size={23} />
                  </View>
                  <View style={styles.copy}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title}>{item.label}</Text>
                      {item.capability === "offline" && authMode === "demo" ? (
                        <StatusBadge tone="neutral">本機</StatusBadge>
                      ) : null}
                    </View>
                    <Text style={styles.description}>{descriptions[item.capability]}</Text>
                  </View>
                  <ChevronRight color={colorTokens.mutedText} size={21} />
                </SurfaceCard>
              </Pressable>
            );
          })}
        </View>
        <SurfaceCard tone="quiet">
          <Text style={styles.boundaryTitle}>功能開放原則</Text>
          <Text style={styles.boundaryText}>
            尚在草稿、內容審核或串接階段的閱讀與對話功能不會出現在正式導覽；完成驗證後才會透過同一份能力設定開放。
          </Text>
        </SurfaceCard>
      </ContentScreen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  boundaryText: { color: colorTokens.mutedText, fontSize: 14, lineHeight: 22 },
  boundaryTitle: { color: colorTokens.text, fontSize: 15, fontWeight: "800" },
  card: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 108,
    padding: spacingTokens.md,
  },
  copy: { flex: 1, gap: spacingTokens.xs, minWidth: 0 },
  description: { color: colorTokens.mutedText, fontSize: 13, lineHeight: 20 },
  grid: { gap: spacingTokens.md },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colorTokens.primarySoft,
    borderRadius: radiusTokens.md,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  pressable: { borderRadius: radiusTokens.lg },
  pressed: { opacity: 0.72 },
  title: { color: colorTokens.text, fontSize: 17, fontWeight: "800" },
  titleRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacingTokens.sm },
});
