import type { PropsWithChildren } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { useBootstrapAuth } from "./useBootstrapAuth";
import { useAuthStore } from "./useAuthStore";

interface AuthGateProps extends PropsWithChildren {
  mode: "guest" | "onboarding" | "protected";
}

export function AuthGate({ children, mode }: AuthGateProps) {
  useBootstrapAuth();
  const authMode = useAuthStore((state) => state.authMode);
  const profile = useAuthStore((state) => state.profile);
  const status = useAuthStore((state) => state.status);
  const authenticated = authMode !== null;

  if (status === "loading") {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator accessibilityLabel="正在載入登入狀態" color={colorTokens.primary} />
        <Text style={styles.loadingText}>正在確認登入狀態...</Text>
      </View>
    );
  }

  if (mode === "guest") {
    if (authenticated && profile?.onboardingCompleted) {
      return <Redirect href="/home" />;
    }

    if (authenticated) {
      return <Redirect href="/onboarding" />;
    }

    return children;
  }

  if (!authenticated) {
    return <Redirect href="/sign-in" />;
  }

  if (mode === "onboarding") {
    if (profile?.onboardingCompleted) {
      return <Redirect href="/home" />;
    }

    return children;
  }

  if (!profile?.onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  return children;
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
