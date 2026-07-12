import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import type { ForgotPasswordRequest } from "@deutschtrainer/validation";
import { forgotPasswordRequestSchema } from "@deutschtrainer/validation";
import { AppScreen } from "../src/components/AppScreen";
import { MessageBanner } from "../src/components/MessageBanner";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { TextField } from "../src/components/TextField";
import { AuthGate } from "../src/features/auth/AuthGate";
import { useAuthStore } from "../src/features/auth/useAuthStore";

export default function ForgotPasswordScreen() {
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const noticeMessage = useAuthStore((state) => state.noticeMessage);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<ForgotPasswordRequest>({
    defaultValues: {
      email: "",
    },
    resolver: zodResolver(forgotPasswordRequestSchema),
  });

  return (
    <AuthGate mode="guest">
      <AppScreen
        description="輸入註冊信箱，我們會透過 Supabase Auth 寄出重設密碼信。"
        title="忘記密碼"
      >
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
        <PrimaryButton
          accessibilityLabel="寄出重設密碼信"
          loading={isSubmitting}
          onPress={handleSubmit((values) => {
            void resetPassword(values);
          })}
        >
          寄出重設密碼信
        </PrimaryButton>
        <Link href="/sign-in">返回登入</Link>
      </AppScreen>
    </AuthGate>
  );
}
