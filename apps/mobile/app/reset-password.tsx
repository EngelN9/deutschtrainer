import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import type { UpdatePasswordRequest } from "@deutschtrainer/validation";
import { updatePasswordRequestSchema } from "@deutschtrainer/validation";
import { AppScreen } from "../src/components/AppScreen";
import { AuthLink } from "../src/components/AuthLink";
import { MessageBanner } from "../src/components/MessageBanner";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { TextField } from "../src/components/TextField";
import { useAuthStore } from "../src/features/auth/useAuthStore";
import { useBootstrapAuth } from "../src/features/auth/useBootstrapAuth";

/**
 * Deliberately not wrapped in `AuthGate`. The recovery link establishes a real session before this
 * screen renders, so `mode="guest"` would redirect straight to /home and the new password could
 * never be typed. Bootstrapping directly and branching on the session is the whole gate this
 * screen needs.
 */
export default function ResetPasswordScreen() {
  useBootstrapAuth();
  const router = useRouter();
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const noticeMessage = useAuthStore((state) => state.noticeMessage);
  const session = useAuthStore((state) => state.session);
  const status = useAuthStore((state) => state.status);
  const updatePassword = useAuthStore((state) => state.updatePassword);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<UpdatePasswordRequest>({
    defaultValues: { password: "" },
    resolver: zodResolver(updatePasswordRequestSchema),
  });

  if (status === "loading") {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator accessibilityLabel="正在確認重設連結" color={colorTokens.primary} />
        <Text style={styles.loadingText}>正在確認重設連結...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <AppScreen
        description="重設連結可能已過期或已經使用過。請重新寄一封新的重設密碼信。"
        title="連結已失效"
      >
        <AuthLink href="/forgot-password">重新寄送重設密碼信</AuthLink>
        <AuthLink href="/sign-in">返回登入</AuthLink>
      </AppScreen>
    );
  }

  return (
    <AppScreen description="輸入新的密碼，完成後會直接以新密碼登入。" title="設定新密碼">
      <MessageBanner message={errorMessage} tone="error" />
      <MessageBanner message={noticeMessage} tone="info" />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            accessibilityLabel="新密碼"
            autoCapitalize="none"
            error={errors.password?.message}
            label="新密碼"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            placeholder="至少 8 個字元"
            secureTextEntry
            value={field.value}
          />
        )}
      />
      <PrimaryButton
        accessibilityLabel="儲存新密碼"
        loading={isSubmitting}
        onPress={handleSubmit(async (values) => {
          if (await updatePassword(values)) {
            router.replace("/home");
          }
        })}
      >
        儲存新密碼
      </PrimaryButton>
      <AuthLink href="/sign-in">返回登入</AuthLink>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: "center",
    backgroundColor: colorTokens.background,
    flex: 1,
    gap: spacingTokens.md,
    justifyContent: "center",
    padding: spacingTokens.lg,
  },
  loadingText: {
    color: colorTokens.mutedText,
    fontSize: 16,
  },
});
