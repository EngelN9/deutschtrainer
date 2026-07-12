import type { ComponentType } from "react";
import { Pressable, StyleSheet } from "react-native";
import { colorTokens } from "@deutschtrainer/ui";

interface IconProps {
  color?: string;
  size?: number;
  strokeWidth?: number;
}

interface IconButtonProps {
  accessibilityLabel: string;
  icon: ComponentType<IconProps>;
  onPress: () => void;
  tone?: "default" | "danger";
}

export function IconButton({
  accessibilityLabel,
  icon: Icon,
  onPress,
  tone = "default",
}: IconButtonProps) {
  const color = tone === "danger" ? colorTokens.danger : colorTokens.text;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
    >
      <Icon color={color} size={21} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pressed: {
    opacity: 0.72,
  },
});
