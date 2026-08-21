import { useRouter } from "expo-router";
import { ArrowRight, BookOpen, CheckCircle2, FilePenLine, RefreshCcw } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { colorTokens, radiusTokens, spacingTokens } from "@deutschtrainer/ui";
import { AppScreen } from "../src/components/AppScreen";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { SurfaceCard } from "../src/components/UiPrimitives";
import { AuthGate } from "../src/features/auth/AuthGate";
import { demoAuthEnabled } from "../src/features/auth/demoAuth";
import { useAuthStore } from "../src/features/auth/useAuthStore";
import { mobileEnv } from "../src/lib/env";

export default function WelcomeScreen() {
  const router = useRouter();
  const startDemo = useAuthStore((state) => state.startDemo);
  const startGuestTrial = useAuthStore((state) => state.startGuestTrial);

  return (
    <AuthGate mode="guest">
      <AppScreen
        description="用繁體中文理解真正影響表達的問題，建立從 B1 到 C2 的輸出與複習節奏。"
        eyebrow="DeutschTrainer · B1–C2"
        title="把每一次德文練習，變成看得見的下一步。"
      >
        <View style={styles.brandGraphic}>
          <View style={styles.bookMark}>
            <BookOpen color={colorTokens.onStrong} size={34} strokeWidth={2.2} />
          </View>
          <View style={styles.accentMark} />
        </View>

        <SurfaceCard tone="highlight">
          <Text style={styles.journeyTitle}>一次完整輸出循環</Text>
          <JourneyRow icon={FilePenLine} label="寫一段符合程度的短文" number="01" />
          <JourneyRow icon={CheckCircle2} label="只先處理三個關鍵問題" number="02" />
          <JourneyRow icon={RefreshCcw} label="重寫並比較第一版與最新版" number="03" />
        </SurfaceCard>

        {mobileEnv.guestTrialEnabled ? (
          <PrimaryButton
            accessibilityLabel="不用註冊，直接開始試用"
            onPress={() => void startGuestTrial()}
          >
            先試用，不用註冊
          </PrimaryButton>
        ) : null}
        {mobileEnv.guestTrialEnabled ? (
          <Text style={styles.demoNote}>
            直接開始練習真實課程；之後可以隨時建立帳號，學習紀錄會一併保留。
          </Text>
        ) : null}
        <PrimaryButton
          accessibilityLabel="前往註冊頁"
          onPress={() => router.push("/sign-up")}
          variant={mobileEnv.guestTrialEnabled ? "secondary" : "primary"}
        >
          建立帳號，開始學習
        </PrimaryButton>
        <PrimaryButton
          accessibilityLabel="前往登入頁"
          onPress={() => router.push("/sign-in")}
          variant="secondary"
        >
          已有帳號，登入
        </PrimaryButton>

        {demoAuthEnabled ? (
          <SurfaceCard style={styles.demoCard} tone="quiet">
            <View style={styles.demoHeading}>
              <Text style={styles.demoTitle}>想先看看課程？</Text>
              <ArrowRight color={colorTokens.accent} size={18} />
            </View>
            <Text style={styles.demoNote}>
              離線 Demo 無需帳號，固定題與進度只保存在本機；雲端同步與 AI 功能不會以假結果代替。
            </Text>
            <PrimaryButton
              accessibilityLabel="開始離線 Demo"
              onPress={() => void startDemo()}
              variant="secondary"
            >
              離線 Demo 試用
            </PrimaryButton>
          </SurfaceCard>
        ) : null}
      </AppScreen>
    </AuthGate>
  );
}

function JourneyRow({
  icon: Icon,
  label,
  number,
}: {
  icon: typeof FilePenLine;
  label: string;
  number: string;
}) {
  return (
    <View style={styles.journeyRow}>
      <View style={styles.journeyIcon}>
        <Icon color={colorTokens.primary} size={20} />
      </View>
      <Text style={styles.journeyLabel}>{label}</Text>
      <Text style={styles.journeyNumber}>{number}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  accentMark: {
    backgroundColor: colorTokens.accent,
    borderRadius: radiusTokens.pill,
    bottom: 7,
    height: 18,
    position: "absolute",
    right: 8,
    width: 12,
  },
  bookMark: {
    alignItems: "center",
    backgroundColor: colorTokens.primary,
    borderRadius: radiusTokens.lg,
    height: 72,
    justifyContent: "center",
    transform: [{ rotate: "-3deg" }],
    width: 72,
  },
  brandGraphic: { alignSelf: "flex-start", height: 78, width: 84 },
  demoCard: { boxShadow: undefined, gap: spacingTokens.sm },
  demoHeading: { alignItems: "center", flexDirection: "row", gap: spacingTokens.sm },
  demoNote: { color: colorTokens.mutedText, fontSize: 13, lineHeight: 20 },
  demoTitle: { color: colorTokens.text, flex: 1, fontSize: 15, fontWeight: "800" },
  journeyIcon: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderRadius: radiusTokens.md,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  journeyLabel: {
    color: colorTokens.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  journeyNumber: { color: colorTokens.accent, fontSize: 12, fontWeight: "900" },
  journeyRow: { alignItems: "center", flexDirection: "row", gap: spacingTokens.md },
  journeyTitle: { color: colorTokens.primaryDark, fontSize: 14, fontWeight: "900" },
});
