import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { useBootstrapAuth } from "../src/features/auth/useBootstrapAuth";
import { useAuthStore } from "../src/features/auth/useAuthStore";

export default function IndexRoute() {
  useBootstrapAuth();
  const authMode = useAuthStore((state) => state.authMode);
  const profile = useAuthStore((state) => state.profile);
  const status = useAuthStore((state) => state.status);

  if (status === "loading") {
    return (
      <View style={styles.screen}>
        <ActivityIndicator accessibilityLabel="正在載入 App" color={colorTokens.primary} />
        <Text style={styles.text}>正在載入...</Text>
      </View>
    );
  }

  if (!authMode) {
    return <Redirect href="/welcome" />;
  }

  if (!profile?.onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/home" />;
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: colorTokens.background,
    flex: 1,
    gap: spacingTokens.md,
    justifyContent: "center",
  },
  text: {
    color: colorTokens.mutedText,
    fontSize: 16,
  },
});
