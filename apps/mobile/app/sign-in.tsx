import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import type { SignInRequest } from "@deutschtrainer/validation";
import { signInRequestSchema } from "@deutschtrainer/validation";
import { AppScreen } from "../src/components/AppScreen";
import { AuthLink } from "../src/components/AuthLink";
import { MessageBanner } from "../src/components/MessageBanner";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { TextField } from "../src/components/TextField";
import { AuthGate } from "../src/features/auth/AuthGate";
import { ConnectedAuthScreenGuard } from "../src/features/auth/ConnectedAuthScreenGuard";
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
    <ConnectedAuthScreenGuard>
      <AuthGate mode="guest">
        <AppScreen
          description="使用為 DeutschTrainer 建立的電子郵件與密碼；目前未提供 Google 登入。"
          title="登入"
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
          <AuthLink href="/forgot-password">忘記密碼</AuthLink>
          <AuthLink href="/sign-up">還沒有帳號？建立帳號</AuthLink>
        </AppScreen>
      </AuthGate>
    </ConnectedAuthScreenGuard>
  );
}
