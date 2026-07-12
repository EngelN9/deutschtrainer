import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";

interface PrimaryButtonProps extends PropsWithChildren {
  accessibilityLabel: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
}

export function PrimaryButton({
  accessibilityLabel,
  children,
  disabled = false,
  loading = false,
  onPress,
  variant = "primary",
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" ? styles.primary : null,
        variant === "secondary" ? styles.secondary : null,
        variant === "danger" ? styles.danger : null,
        pressed ? styles.pressed : null,
        disabled || loading ? styles.disabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? colorTokens.primary : "#FFFFFF"} />
      ) : (
        <Text style={[styles.text, variant === "secondary" ? styles.secondaryText : null]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacingTokens.md,
    paddingVertical: spacingTokens.sm,
  },
  danger: {
    backgroundColor: colorTokens.danger,
    borderColor: colorTokens.danger,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.82,
  },
  primary: {
    backgroundColor: colorTokens.primary,
    borderColor: colorTokens.primary,
  },
  secondary: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
  },
  secondaryText: {
    color: colorTokens.primary,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
