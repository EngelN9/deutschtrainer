import { Platform, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../src/features/auth/AuthGate";
import { AppText } from "../src/components/AppText";
import { ContentScreen } from "../src/components/ContentScreen";

// The classroom is a separate Vite bundle (Excalidraw, react-dom, WebRTC) published into this
// app's own static output at /classroom-app/, and reached through a same-origin iframe. Keeping it
// out of the Metro bundle means the shared web bundle does not grow, the native build never has to
// resolve browser-only packages, and the classroom's global stylesheet stays sandboxed. Same origin
// is what removes the second login: both documents read one Supabase session from one localStorage.
//
// One file rather than a ClassroomFrame.web.tsx split on purpose — apps/mobile/tsconfig.json
// includes app/**/*.tsx and src/**/*.ts but not src/**/*.tsx, so a .web.tsx component that nothing
// imports on the native side would never be typechecked.
const CLASSROOM_URL = "/classroom-app/index.html";

// ponytail: a fixed frame height inside ContentScreen's ScrollView, which is a tuning knob rather
// than a truth. Give the classroom its own full-height layout if the board ever needs the viewport.
const frameStyle = {
  border: 0,
  display: "block",
  height: "min(86vh, 1100px)",
  minHeight: 680,
  width: "100%",
} as const;

export default function ClassroomScreen() {
  return (
    <AuthGate mode="protected">
      <ContentScreen
        description="選擇語音或文字練習，讓 AI 導師把句型、修正與繁中提示整理到共享白板。"
        eyebrow="AI Tutor · Virtual Classroom"
        showMainNavigation
        title="五分鐘德語虛擬教室"
      >
        {Platform.OS === "web" ? (
          <>
            <View accessibilityRole="summary" style={styles.preflightCard}>
              <View style={styles.preflightHeader}>
                <AppText variant="subheading">開始前，先準備好三件事</AppText>
                <View style={styles.betaBadge}>
                  <AppText style={styles.betaBadgeText} variant="caption">
                    受限測試
                  </AppText>
                </View>
              </View>
              <View style={styles.preflightList}>
                <AppText tone="muted">① 找一個可以開口說話的安靜空間</AppText>
                <AppText tone="muted">② 允許瀏覽器使用麥克風，或改選文字練習</AppText>
                <AppText tone="muted">③ AI 可能出錯，重要文法請再查證</AppText>
              </View>
            </View>
            <View style={styles.frameShell}>
              {/* allow= is redundant while the frame is same-origin (Permissions Policy defaults
                  microphone to `self`, which covers same-origin children), but it is what keeps the
                  microphone working if the classroom is ever served from its own origin. */}
              <iframe allow="microphone" src={CLASSROOM_URL} style={frameStyle} title="虛擬教室" />
            </View>
          </>
        ) : (
          <View style={styles.unsupported}>
            <Text style={styles.unsupportedText}>
              虛擬教室需要瀏覽器的麥克風與 WebRTC 支援，目前僅提供網頁版。
            </Text>
          </View>
        )}
      </ContentScreen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  betaBadge: {
    backgroundColor: colorTokens.restrictedSoft,
    borderColor: colorTokens.restrictedBorder,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacingTokens.md,
    paddingVertical: spacingTokens.xs,
  },
  betaBadgeText: {
    color: colorTokens.restrictedDark,
  },
  frameShell: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  preflightCard: {
    backgroundColor: colorTokens.aiSoft,
    borderColor: colorTokens.aiBorder,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacingTokens.md,
    padding: spacingTokens.lg,
  },
  preflightHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.md,
    justifyContent: "space-between",
  },
  preflightList: {
    gap: spacingTokens.sm,
  },
  unsupported: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacingTokens.lg,
  },
  unsupportedText: {
    color: colorTokens.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
});
