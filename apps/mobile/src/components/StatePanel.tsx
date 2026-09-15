import { AlertCircle, Inbox } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colorTokens, radiusTokens, spacingTokens } from "@deutschtrainer/ui";
import { AppText } from "./AppText";
import { PrimaryButton } from "./PrimaryButton";

interface StatePanelProps {
  message: string;
  onRetry?: () => void;
  state: "empty" | "error" | "loading";
  title: string;
}

export function StatePanel({ message, onRetry, state, title }: StatePanelProps) {
  return (
    <View style={styles.panel}>
      {state === "loading" ? (
        <ActivityIndicator accessibilityLabel={title} color={colorTokens.primary} size="large" />
      ) : state === "error" ? (
        <AlertCircle color={colorTokens.danger} size={24} strokeWidth={2} />
      ) : (
        <Inbox color={colorTokens.mutedText} size={24} strokeWidth={2} />
      )}
      <AppText headingLevel={2} style={styles.centered} variant="subheading">
        {title}
      </AppText>
      <AppText style={styles.centered} tone="muted" variant="bodySmall">
        {message}
      </AppText>
      {state === "error" && onRetry ? (
        <View style={styles.retry}>
          <PrimaryButton accessibilityLabel="重新載入" onPress={onRetry} variant="secondary">
            重新載入
          </PrimaryButton>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    textAlign: "center",
  },
  panel: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.sm,
    borderWidth: 1,
    gap: spacingTokens.sm,
    minHeight: 220,
    justifyContent: "center",
    padding: spacingTokens.lg,
  },
  retry: {
    marginTop: spacingTokens.sm,
    minWidth: 160,
  },
});
