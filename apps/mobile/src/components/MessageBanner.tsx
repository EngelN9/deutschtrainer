import { StyleSheet, Text } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { sanitizeUserFacingText } from "../lib/userFacingErrors";

interface MessageBannerProps {
  message: string | null;
  tone: "error" | "info";
}

export function MessageBanner({ message, tone }: MessageBannerProps) {
  if (!message) {
    return null;
  }

  const renderedMessage = tone === "error" ? sanitizeUserFacingText(message) : message;

  return (
    <Text
      accessibilityRole={tone === "error" ? "alert" : "text"}
      style={[styles.banner, tone === "error" ? styles.error : styles.info]}
    >
      {renderedMessage}
    </Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    lineHeight: 20,
    padding: spacingTokens.md,
  },
  error: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    color: colorTokens.danger,
  },
  info: {
    backgroundColor: "#EFF6FF",
    borderColor: "#93C5FD",
    color: colorTokens.primary,
  },
});
