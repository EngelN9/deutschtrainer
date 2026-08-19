import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { colorTokens } from "@deutschtrainer/ui";
import { AppScreen } from "../src/components/AppScreen";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { AuthGate } from "../src/features/auth/AuthGate";
import { useAuthStore } from "../src/features/auth/useAuthStore";
import { mobileEnv } from "../src/lib/env";

export default function WelcomeScreen() {
  const router = useRouter();
  const startDemo = useAuthStore((state) => state.startDemo);

  return (
    <AuthGate mode="guest">
      <AppScreen
        description="以繁體中文文法解釋、AI 錯誤診斷、間隔複習與輸出訓練，建立 B1 到 C2 的德語學習路徑。"
        eyebrow="DeutschTrainer"
        title="德語 B1-C2 自學系統"
      >
        {mobileEnv.supportsOfflineDemo ? (
          <PrimaryButton accessibilityLabel="開始離線 Demo" onPress={() => void startDemo()}>
            離線 Demo 試用
          </PrimaryButton>
        ) : null}
        {mobileEnv.supportsOfflineDemo ? (
          <Text style={styles.demoNote}>
            此 Preview APK 僅提供離線 Demo；課程與進度保存在本機。正式帳號登入請使用 Staging
            連線版。
          </Text>
        ) : null}
        {mobileEnv.supportsConnectedAuth ? (
          <>
            <PrimaryButton accessibilityLabel="前往註冊頁" onPress={() => router.push("/sign-up")}>
              建立帳號
            </PrimaryButton>
            <PrimaryButton
              accessibilityLabel="前往登入頁"
              onPress={() => router.push("/sign-in")}
              variant="secondary"
            >
              已有帳號，登入
            </PrimaryButton>
            <Text style={styles.demoNote}>
              請使用為 DeutschTrainer 建立的電子郵件與密碼；目前未提供「使用 Google 登入」。
            </Text>
          </>
        ) : null}
      </AppScreen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  demoNote: {
    color: colorTokens.mutedText,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
});
