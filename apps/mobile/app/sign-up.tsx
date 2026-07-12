import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import type { SignUpRequest } from "@deutschtrainer/validation";
import { signUpRequestSchema } from "@deutschtrainer/validation";
import { AppScreen } from "../src/components/AppScreen";
import { MessageBanner } from "../src/components/MessageBanner";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { TextField } from "../src/components/TextField";
import { AuthGate } from "../src/features/auth/AuthGate";
import { useAuthStore } from "../src/features/auth/useAuthStore";

export default function SignUpScreen() {
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const noticeMessage = useAuthStore((state) => state.noticeMessage);
  const signUp = useAuthStore((state) => state.signUp);
  const status = useAuthStore((state) => state.status);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<SignUpRequest>({
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
    },
    resolver: zodResolver(signUpRequestSchema),
  });

  return (
    <AuthGate mode="guest">
      <AppScreen description="第一版只支援 B1、B2、C1、C2，註冊後會進入初次設定。" title="建立帳號">
        <MessageBanner message={errorMessage} tone="error" />
        <MessageBanner message={noticeMessage} tone="info" />
        <Controller
          control={control}
          name="displayName"
          render={({ field }) => (
            <TextField
              accessibilityLabel="顯示名稱"
              error={errors.displayName?.message}
              label="顯示名稱"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="你的名字"
              value={field.value}
            />
          )}
        />
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
          accessibilityLabel="建立帳號"
          loading={isSubmitting || status === "loading"}
          onPress={handleSubmit((values) => {
            void signUp(values);
          })}
        >
          建立帳號
        </PrimaryButton>
        <Link href="/sign-in">已經有帳號？登入</Link>
      </AppScreen>
    </AuthGate>
  );
}
