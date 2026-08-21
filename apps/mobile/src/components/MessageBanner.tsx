import { StyleSheet, Text } from "react-native";
import { colorTokens, radiusTokens, spacingTokens } from "@deutschtrainer/ui";

interface MessageBannerProps {
  message: string | null;
  tone: "error" | "info" | "success" | "warning";
}

export function MessageBanner({ message, tone }: MessageBannerProps) {
  if (!message) {
    return null;
  }

  return (
    <Text
      accessibilityRole={tone === "error" ? "alert" : "text"}
      selectable
      style={[
        styles.banner,
        tone === "error" ? styles.error : null,
        tone === "info" ? styles.info : null,
        tone === "success" ? styles.success : null,
        tone === "warning" ? styles.warning : null,
      ]}
    >
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    fontSize: 14,
    lineHeight: 20,
    padding: spacingTokens.md,
  },
  error: {
    backgroundColor: colorTokens.dangerSoft,
    borderColor: "#EAA19A",
    color: colorTokens.danger,
  },
  info: {
    backgroundColor: colorTokens.primarySoft,
    borderColor: "#AFC9FA",
    color: colorTokens.primaryDark,
  },
  success: {
    backgroundColor: colorTokens.successSoft,
    borderColor: "#9DD1B5",
    color: colorTokens.success,
  },
  warning: {
    backgroundColor: colorTokens.warningSoft,
    borderColor: "#E7C779",
    color: colorTokens.warning,
  },
});
