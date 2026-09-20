import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Check, Eye, EyeOff, LockKeyhole } from "lucide-react-native";
import { type ReactNode, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  colorTokens,
  nativeElevationTokens,
  radiusTokens,
  spacingTokens,
  typographyTokens,
} from "@deutschtrainer/ui";
import type { SignInRequest } from "@deutschtrainer/validation";
import { signInRequestSchema } from "@deutschtrainer/validation";
import { MessageBanner } from "../src/components/MessageBanner";
import { AuthGate } from "../src/features/auth/AuthGate";
import { useAuthStore } from "../src/features/auth/useAuthStore";

const desktopBreakpoint = 840;
const loginColors = {
  action: "#2563EB",
  actionPressed: "#174AA5",
  brandSurface: "#153A78",
} as const;

interface LoginFieldProps {
  accessibilityLabel: string;
  autoComplete: TextInputProps["autoComplete"];
  disabled: boolean;
  error?: string;
  inputRef?: React.RefObject<TextInput | null>;
  keyboardType?: TextInputProps["keyboardType"];
  label: string;
  labelAction?: ReactNode;
  name: "email" | "password";
  onBlur: () => void;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
  placeholder: string;
  returnKeyType: TextInputProps["returnKeyType"];
  secureTextEntry?: boolean;
  value: string;
}

function LoginField({
  accessibilityLabel,
  autoComplete,
  disabled,
  error,
  inputRef,
  keyboardType = "default",
  label,
  labelAction,
  name,
  onBlur,
  onChangeText,
  onSubmitEditing,
  placeholder,
  returnKeyType,
  secureTextEntry = false,
  value,
}: LoginFieldProps) {
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = name === "password";
  const labelId = `${name}-label`;

  return (
    <View style={[styles.fieldGroup, labelAction ? styles.fieldGroupWithAction : null]}>
      <View style={[styles.fieldLabelRow, labelAction ? styles.fieldLabelRowWithAction : null]}>
        <Text nativeID={labelId} style={styles.fieldLabel}>
          {label}
        </Text>
      </View>
      <View
        style={[
          styles.inputShell,
          focused ? styles.inputShellFocused : null,
          error ? styles.inputShellError : null,
          disabled ? styles.inputShellDisabled : null,
        ]}
      >
        <TextInput
          accessibilityLabel={accessibilityLabel}
          accessibilityLabelledBy={labelId}
          accessibilityState={{ disabled }}
          autoCapitalize="none"
          autoComplete={autoComplete}
          editable={!disabled}
          keyboardType={keyboardType}
          nativeID={name}
          onBlur={() => {
            setFocused(false);
            onBlur();
          }}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={colorTokens.mutedText}
          ref={inputRef}
          returnKeyType={returnKeyType}
          secureTextEntry={isPassword ? !passwordVisible : secureTextEntry}
          style={styles.input}
          value={value}
        />
        {isPassword ? (
          <Pressable
            accessibilityLabel={passwordVisible ? "隱藏密碼" : "顯示密碼"}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            hitSlop={4}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={({ pressed }) => [
              styles.visibilityButton,
              pressed ? styles.visibilityButtonPressed : null,
            ]}
          >
            {passwordVisible ? (
              <EyeOff color={colorTokens.mutedText} size={20} strokeWidth={2} />
            ) : (
              <Eye color={colorTokens.mutedText} size={20} strokeWidth={2} />
            )}
          </Pressable>
        ) : null}
      </View>
      {labelAction ? <View style={styles.fieldLabelAction}>{labelAction}</View> : null}
      {error ? (
        <Text accessibilityLiveRegion="polite" role="alert" style={styles.fieldError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function LoginButton({ loading, onPress }: { loading: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={loading ? "登入中" : "登入帳號"}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.loginButton,
        pressed ? styles.loginButtonPressed : null,
        loading ? styles.loginButtonLoading : null,
      ]}
    >
      {loading ? <ActivityIndicator color={colorTokens.onStrong} size="small" /> : null}
      <Text style={styles.loginButtonText}>{loading ? "登入中…" : "登入"}</Text>
    </Pressable>
  );
}

export default function SignInScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= desktopBreakpoint;
  const safeAreaInsets = useSafeAreaInsets();
  const passwordInputRef = useRef<TextInput>(null);
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
  const loading = isSubmitting || status === "loading";
  const submit = handleSubmit((values) => {
    void signIn(values);
  });

  return (
    <AuthGate mode="guest">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.screen, isDesktop ? null : styles.screenMobile]}
      >
        <StatusBar style={isDesktop ? "dark" : "light"} />
        <ScrollView
          bounces={false}
          contentContainerStyle={[
            styles.scrollContent,
            isDesktop ? styles.scrollContentDesktop : styles.scrollContentMobile,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, isDesktop ? styles.cardDesktop : styles.cardMobile]}>
            <View
              style={[
                styles.brandPanel,
                isDesktop ? styles.brandPanelDesktop : styles.brandPanelMobile,
                isDesktop
                  ? null
                  : {
                      minHeight: 80 + safeAreaInsets.top,
                      paddingTop: Math.max(safeAreaInsets.top, spacingTokens.sm),
                    },
              ]}
            >
              <View style={[styles.brandLockup, isDesktop ? null : styles.brandLockupMobile]}>
                <Image
                  accessibilityLabel="DeutschTrainer"
                  resizeMode="contain"
                  // React Native resolves bundled static assets through require.
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  source={require("../assets/logo-rounded.png")}
                  style={[styles.brandLogo, isDesktop ? null : styles.brandLogoMobile]}
                />
                <Text numberOfLines={1} style={styles.brandName}>
                  DeutschTrainer
                </Text>
              </View>
              {isDesktop ? (
                <View style={styles.brandCopy}>
                  <Text style={styles.brandEyebrow}>德語 B1–C2 繁中學習平台</Text>
                  <Text style={styles.brandTagline}>從 B1 到 C2，把德語變成你的能力。</Text>
                  <Text style={styles.brandDescription}>
                    用清楚的繁體中文解析、智慧複習與實際輸出練習，穩定累積真正能使用的德語。
                  </Text>
                </View>
              ) : null}
              {isDesktop ? (
                <View style={styles.benefits}>
                  {[
                    "依 CEFR 程度建立清楚路徑",
                    "保存課程、複習與寫作進度",
                    "在每次練習中看見下一步",
                  ].map((benefit) => (
                    <View key={benefit} style={styles.benefitRow}>
                      <View style={styles.benefitIcon}>
                        <Check color={colorTokens.primaryDark} size={14} strokeWidth={3} />
                      </View>
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <View
              style={[
                styles.formPanel,
                isDesktop ? styles.formPanelDesktop : styles.formPanelMobile,
                isDesktop
                  ? null
                  : { paddingBottom: Math.max(safeAreaInsets.bottom, spacingTokens.lg) },
              ]}
            >
              <View
                style={[
                  styles.formContent,
                  isDesktop
                    ? styles.formContentDesktop
                    : { width: Math.min(440, Math.max(0, width - 40)) },
                ]}
              >
                <View style={styles.formHeader}>
                  <Text accessibilityRole="header" style={styles.formTitle}>
                    歡迎回來
                  </Text>
                  <Text style={styles.formDescription}>登入後繼續你的課程、複習與寫作練習。</Text>
                </View>

                <View style={styles.messages}>
                  <MessageBanner message={errorMessage} tone="error" />
                  <MessageBanner message={noticeMessage} tone="info" />
                </View>

                <View style={styles.formFields}>
                  <Controller
                    control={control}
                    name="email"
                    render={({ field }) => (
                      <LoginField
                        accessibilityLabel="電子郵件"
                        autoComplete="email"
                        disabled={loading}
                        error={errors.email?.message}
                        keyboardType="email-address"
                        label="電子郵件"
                        name="email"
                        onBlur={field.onBlur}
                        onChangeText={field.onChange}
                        onSubmitEditing={() => passwordInputRef.current?.focus()}
                        placeholder="you@example.com"
                        returnKeyType="next"
                        value={field.value}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="password"
                    render={({ field }) => (
                      <LoginField
                        accessibilityLabel="密碼"
                        autoComplete="current-password"
                        disabled={loading}
                        error={errors.password?.message}
                        inputRef={passwordInputRef}
                        label="密碼"
                        labelAction={
                          <Link asChild href="/forgot-password">
                            <Pressable
                              accessibilityRole="link"
                              disabled={loading}
                              style={({ pressed }) => [
                                styles.passwordRecoveryTarget,
                                pressed ? styles.textLinkPressed : null,
                              ]}
                            >
                              <Text style={styles.passwordRecoveryLink}>忘記密碼？</Text>
                            </Pressable>
                          </Link>
                        }
                        name="password"
                        onBlur={field.onBlur}
                        onChangeText={field.onChange}
                        onSubmitEditing={submit}
                        placeholder="至少 8 個字元"
                        returnKeyType="done"
                        secureTextEntry
                        value={field.value}
                      />
                    )}
                  />

                  <LoginButton loading={loading} onPress={submit} />
                </View>

                <View style={styles.trustNote}>
                  <LockKeyhole color={colorTokens.primaryDark} size={17} strokeWidth={2.2} />
                  <Text style={styles.trustNoteText}>你的學習進度會安全地保留在帳號中。</Text>
                </View>

                <View style={styles.signUpRow}>
                  <Text style={styles.signUpPrompt}>還沒有帳號？</Text>
                  <Link asChild href="/sign-up">
                    <Pressable
                      accessibilityRole="link"
                      disabled={loading}
                      style={({ pressed }) => [
                        styles.inlineLinkTarget,
                        pressed ? styles.textLinkPressed : null,
                      ]}
                    >
                      <Text style={styles.textLink}>建立帳號</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  benefitIcon: {
    alignItems: "center",
    backgroundColor: colorTokens.onStrong,
    borderRadius: radiusTokens.pill,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  benefitRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.sm,
  },
  benefitText: {
    color: colorTokens.onStrong,
    flex: 1,
    fontSize: typographyTokens.bodySmall.fontSize,
    lineHeight: typographyTokens.bodySmall.lineHeight,
  },
  benefits: {
    gap: spacingTokens.md,
    marginTop: "auto",
  },
  brandCopy: {
    gap: spacingTokens.sm,
  },
  brandDescription: {
    color: colorTokens.primarySoft,
    fontSize: typographyTokens.body.fontSize,
    lineHeight: 26,
  },
  brandEyebrow: {
    color: colorTokens.primarySoft,
    fontSize: typographyTokens.caption.fontSize,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  brandLockup: {
    alignItems: "center",
    flexDirection: "row",
    gap: 28,
    minWidth: 0,
  },
  brandLockupMobile: {
    gap: 20,
  },
  brandLogo: {
    height: 84,
    width: 84,
  },
  brandLogoMobile: {
    height: 60,
    width: 60,
  },
  brandName: {
    color: colorTokens.onStrong,
    flexShrink: 1,
    fontSize: typographyTokens.subheading.fontSize,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  brandPanel: {
    backgroundColor: loginColors.brandSurface,
    minWidth: 0,
  },
  brandPanelDesktop: {
    flex: 0.88,
    gap: spacingTokens.xxl,
    justifyContent: "flex-start",
    minHeight: 580,
    padding: spacingTokens.xxl,
  },
  brandPanelMobile: {
    alignItems: "flex-start",
    justifyContent: "center",
    minHeight: 80,
    paddingHorizontal: 20,
    paddingVertical: spacingTokens.sm,
  },
  brandTagline: {
    color: colorTokens.onStrong,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.4,
    lineHeight: 40,
  },
  card: {
    backgroundColor: colorTokens.surface,
    minWidth: 0,
    width: "100%",
  },
  cardDesktop: {
    ...nativeElevationTokens.card,
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.xl,
    borderWidth: 1,
    flexDirection: "row",
    maxWidth: 980,
    overflow: "hidden",
  },
  cardMobile: {
    flexGrow: 1,
    flexDirection: "column",
    minHeight: "100%",
  },
  fieldError: {
    color: colorTokens.danger,
    fontSize: typographyTokens.bodySmall.fontSize,
    lineHeight: typographyTokens.bodySmall.lineHeight,
  },
  fieldGroup: {
    gap: spacingTokens.xs,
    minWidth: 0,
  },
  fieldGroupWithAction: {
    position: "relative",
  },
  fieldLabelAction: {
    alignItems: "flex-end",
    justifyContent: "center",
    minHeight: 48,
    position: "absolute",
    right: 0,
    top: -4,
  },
  fieldLabelRow: {
    justifyContent: "center",
  },
  fieldLabelRowWithAction: {
    minHeight: 40,
    paddingRight: 124,
  },
  fieldLabel: {
    color: colorTokens.text,
    fontSize: typographyTokens.label.fontSize,
    fontWeight: typographyTokens.label.fontWeight,
    lineHeight: typographyTokens.label.lineHeight,
  },
  formContent: {
    gap: spacingTokens.lg,
    maxWidth: 440,
    minWidth: 0,
  },
  formContentDesktop: {
    width: "100%",
  },
  formDescription: {
    color: colorTokens.mutedText,
    fontSize: typographyTokens.body.fontSize,
    lineHeight: typographyTokens.body.lineHeight,
  },
  formFields: {
    gap: spacingTokens.md,
  },
  formHeader: {
    gap: spacingTokens.sm,
  },
  formPanel: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    flex: 1.12,
    justifyContent: "center",
    minWidth: 0,
  },
  formPanelDesktop: {
    minHeight: 580,
    padding: spacingTokens.xxl,
  },
  formPanelMobile: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 0,
    paddingTop: spacingTokens.lg,
  },
  formTitle: {
    color: colorTokens.text,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  inlineLinkTarget: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacingTokens.xs,
  },
  input: {
    color: colorTokens.text,
    flex: 1,
    fontSize: typographyTokens.body.fontSize,
    minHeight: 50,
    minWidth: 0,
    paddingHorizontal: spacingTokens.md,
    paddingVertical: spacingTokens.sm,
  },
  inputShell: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.borderInput,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 50,
    minWidth: 0,
  },
  inputShellDisabled: {
    backgroundColor: colorTokens.surfaceMuted,
    borderColor: colorTokens.borderStrong,
  },
  inputShellError: {
    borderColor: colorTokens.danger,
    borderWidth: 2,
  },
  inputShellFocused: {
    borderColor: colorTokens.focusRing,
    borderWidth: 2,
  },
  loginButton: {
    alignItems: "center",
    backgroundColor: loginColors.action,
    borderColor: loginColors.action,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.sm,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: spacingTokens.md,
    paddingVertical: spacingTokens.sm,
  },
  loginButtonLoading: {
    backgroundColor: loginColors.actionPressed,
    borderColor: loginColors.actionPressed,
  },
  loginButtonPressed: {
    backgroundColor: loginColors.actionPressed,
    borderColor: loginColors.actionPressed,
  },
  loginButtonText: {
    color: colorTokens.onStrong,
    fontSize: typographyTokens.body.fontSize,
    fontWeight: "700",
    lineHeight: typographyTokens.body.lineHeight,
  },
  messages: {
    gap: spacingTokens.sm,
  },
  screen: {
    backgroundColor: colorTokens.background,
    flex: 1,
  },
  screenMobile: {
    backgroundColor: colorTokens.surface,
  },
  scrollContent: {
    flexGrow: 1,
    minWidth: 0,
    width: "100%",
  },
  scrollContentDesktop: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacingTokens.md,
  },
  scrollContentMobile: {
    alignItems: "stretch",
  },
  signUpPrompt: {
    color: colorTokens.mutedText,
    fontSize: typographyTokens.bodySmall.fontSize,
    lineHeight: typographyTokens.bodySmall.lineHeight,
  },
  signUpRow: {
    alignItems: "center",
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingTop: spacingTokens.md,
  },
  textLink: {
    color: loginColors.action,
    fontSize: typographyTokens.bodySmall.fontSize,
    fontWeight: "700",
    lineHeight: typographyTokens.bodySmall.lineHeight,
  },
  textLinkPressed: {
    opacity: 0.68,
  },
  passwordRecoveryLink: {
    color: loginColors.action,
    fontSize: typographyTokens.bodySmall.fontSize,
    fontWeight: "400",
    lineHeight: typographyTokens.bodySmall.lineHeight,
    textDecorationLine: "underline",
  },
  passwordRecoveryTarget: {
    alignItems: "flex-end",
    justifyContent: "center",
    minHeight: 48,
    minWidth: 96,
    paddingLeft: spacingTokens.sm,
  },
  trustNote: {
    alignItems: "center",
    backgroundColor: colorTokens.primarySoft,
    borderRadius: radiusTokens.sm,
    flexDirection: "row",
    gap: spacingTokens.sm,
    padding: spacingTokens.sm,
  },
  trustNoteText: {
    color: colorTokens.text,
    flex: 1,
    fontSize: typographyTokens.bodySmall.fontSize,
    lineHeight: typographyTokens.bodySmall.lineHeight,
  },
  visibilityButton: {
    alignItems: "center",
    borderRadius: radiusTokens.sm,
    height: 44,
    justifyContent: "center",
    marginRight: spacingTokens.xs,
    width: 44,
  },
  visibilityButtonPressed: {
    backgroundColor: colorTokens.primarySoft,
  },
});
