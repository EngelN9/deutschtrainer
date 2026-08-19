import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import type { SignUpRequest } from "@deutschtrainer/validation";
import { signUpRequestSchema } from "@deutschtrainer/validation";
import { AppScreen } from "../src/components/AppScreen";
import { AuthLink } from "../src/components/AuthLink";
import { MessageBanner } from "../src/components/MessageBanner";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { TextField } from "../src/components/TextField";
import { AuthGate } from "../src/features/auth/AuthGate";
import { ConnectedAuthScreenGuard } from "../src/features/auth/ConnectedAuthScreenGuard";
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
    <ConnectedAuthScreenGuard>
      <AuthGate mode="guest">
        <AppScreen
          description="使用電子郵件建立 DeutschTrainer 帳號；目前未提供 Google 登入。"
          title="建立帳號"
        >
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
          <AuthLink href="/sign-in">已經有帳號？登入</AuthLink>
        </AppScreen>
      </AuthGate>
    </ConnectedAuthScreenGuard>
  );
}
