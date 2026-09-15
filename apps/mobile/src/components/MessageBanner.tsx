import { AlertCircle, Info } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { colorTokens, radiusTokens, spacingTokens, typographyTokens } from "@deutschtrainer/ui";

interface MessageBannerProps {
  message: string | null;
  tone: "error" | "info";
}

export function MessageBanner({ message, tone }: MessageBannerProps) {
  if (!message) {
    return null;
  }

  const isError = tone === "error";
  // The icon carries the meaning alongside the tint, so it never rests on colour alone.
  const Icon = isError ? AlertCircle : Info;
  const color = isError ? colorTokens.danger : colorTokens.primary;

  return (
    <View
      accessibilityRole={isError ? "alert" : undefined}
      style={[styles.banner, isError ? styles.error : styles.info]}
    >
      <Icon color={color} size={20} strokeWidth={2} />
      <Text style={[styles.text, { color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "flex-start",
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.sm,
    padding: spacingTokens.md,
  },
  error: {
    backgroundColor: colorTokens.dangerSoft,
  },
  info: {
    backgroundColor: colorTokens.primarySoft,
  },
  text: {
    flex: 1,
    fontSize: typographyTokens.bodySmall.fontSize,
    lineHeight: typographyTokens.bodySmall.lineHeight,
  },
});
