import { useRouter } from "expo-router";
import { AppScreen } from "../src/components/AppScreen";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { AuthGate } from "../src/features/auth/AuthGate";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <AuthGate mode="guest">
      <AppScreen
        description="以繁體中文文法解釋、AI 錯誤診斷、間隔複習與輸出訓練，建立 B1 到 C2 的德語學習路徑。"
        eyebrow="DeutschTrainer"
        title="德語 B1-C2 自學系統"
      >
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
