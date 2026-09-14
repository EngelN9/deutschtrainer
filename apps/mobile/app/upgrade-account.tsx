import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Redirect } from "expo-router";
import type { SignUpRequest } from "@deutschtrainer/validation";
import { signUpRequestSchema } from "@deutschtrainer/validation";
import { AppScreen } from "../src/components/AppScreen";
import { AuthLink } from "../src/components/AuthLink";
import { MessageBanner } from "../src/components/MessageBanner";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { TextField } from "../src/components/TextField";
import { AuthGate } from "../src/features/auth/AuthGate";
import { useAuthStore } from "../src/features/auth/useAuthStore";

/**
 * The way out of the guest trial. `sign-up` would mint a second account and orphan the trial's
 * learning history; this upgrades the anonymous user in place so nothing is lost.
 */
export default function UpgradeAccountScreen() {
  return (
    <AuthGate mode="protected">
      <UpgradeAccountForm />
    </AuthGate>
  );
}

function UpgradeAccountForm() {
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const noticeMessage = useAuthStore((state) => state.noticeMessage);
  const isGuestSession = useAuthStore((state) => state.session?.user.is_anonymous === true);
  const upgradeGuestToAccount = useAuthStore((state) => state.upgradeGuestToAccount);
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

  if (!isGuestSession) {
    return <Redirect href="/home" />;
  }

  return (
    <AppScreen
      description="建立帳號後，試用期間的練習紀錄、熟練度與複習排程都會保留。完成 Email 驗證後，可依公開測試額度使用 AI 功能。"
      eyebrow="訪客試用中"
      title="建立帳號，保留學習紀錄"
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
        accessibilityLabel="建立帳號並保留紀錄"
        loading={isSubmitting}
        onPress={handleSubmit((values) => {
          void upgradeGuestToAccount(values);
        })}
      >
        建立帳號
      </PrimaryButton>
      <AuthLink href="/home">稍後再說</AuthLink>
    </AppScreen>
  );
}
