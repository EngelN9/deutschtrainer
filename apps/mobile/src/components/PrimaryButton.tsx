import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colorTokens, radiusTokens, spacingTokens, typographyTokens } from "@deutschtrainer/ui";

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
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
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
        <ActivityIndicator
          color={variant === "secondary" ? colorTokens.primary : colorTokens.onStrong}
        />
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
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    minHeight: 50,
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
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.borderStrong,
  },
  secondaryText: {
    color: colorTokens.primary,
  },
  text: {
    color: colorTokens.onStrong,
    fontSize: typographyTokens.body.fontSize,
    fontWeight: "800",
    lineHeight: typographyTokens.body.lineHeight,
  },
});
