import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { colorTokens } from "@deutschtrainer/ui";
import { AppScreen } from "../src/components/AppScreen";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { AuthGate } from "../src/features/auth/AuthGate";
import { demoAuthEnabled } from "../src/features/auth/demoAuth";
import { useAuthStore } from "../src/features/auth/useAuthStore";

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
        {demoAuthEnabled ? (
          <PrimaryButton accessibilityLabel="開始離線 Demo" onPress={() => void startDemo()}>
            離線 Demo 試用
          </PrimaryButton>
        ) : null}
        {demoAuthEnabled ? (
          <Text style={styles.demoNote}>
            無需帳號；課程與進度保存在本機，雲端 AI 功能暫不開放。
          </Text>
        ) : null}
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
