import { AlertCircle, Inbox } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
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
        <AlertCircle color={colorTokens.danger} size={28} />
      ) : (
        <Inbox color={colorTokens.mutedText} size={28} />
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
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
  message: {
    color: colorTokens.mutedText,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  panel: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
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
  title: {
    color: colorTokens.text,
    fontSize: 18,
    fontWeight: "800",
  },
});
