import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import type { SignInRequest } from "@deutschtrainer/validation";
import { signInRequestSchema } from "@deutschtrainer/validation";
import { AppScreen } from "../src/components/AppScreen";
import { MessageBanner } from "../src/components/MessageBanner";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { TextField } from "../src/components/TextField";
import { AuthGate } from "../src/features/auth/AuthGate";
import { useAuthStore } from "../src/features/auth/useAuthStore";

export default function SignInScreen() {
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const noticeMessage = useAuthStore((state) => state.noticeMessage);
  const signIn = useAuthStore((state) => state.signIn);
  const status = useAuthStore((state) => state.status);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<SignInRequest>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(signInRequestSchema),
  });

  return (
    <AuthGate mode="guest">
      <AppScreen description="登入後會保留你的初次設定與後續學習進度。" title="登入">
        <MessageBanner message={errorMessage} tone="error" />
        <MessageBanner message={noticeMessage} tone="info" />
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              accessibilityLabel="電子郵件"
              autoCapitalize="none"
              error={errors.email?.message}
              keyboardType="email-address"
              label="電子郵件"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="you@example.com"
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <TextField
              accessibilityLabel="密碼"
              autoCapitalize="none"
              error={errors.password?.message}
              label="密碼"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="至少 8 個字元"
              secureTextEntry
              value={field.value}
            />
          )}
        />
        <PrimaryButton
          accessibilityLabel="登入帳號"
          loading={isSubmitting || status === "loading"}
          onPress={handleSubmit((values) => {
            void signIn(values);
          })}
        >
          登入
        </PrimaryButton>
        <Link href="/forgot-password">忘記密碼</Link>
        <Link href="/sign-up">還沒有帳號？建立帳號</Link>
      </AppScreen>
    </AuthGate>
  );
}
