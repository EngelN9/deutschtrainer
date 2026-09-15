import type { PropsWithChildren } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { colorTokens, typographyTokens } from "@deutschtrainer/ui";

type Variant =
  "display" | "title" | "heading" | "subheading" | "body" | "bodySmall" | "label" | "caption";

type Tone = "default" | "muted" | "teal" | "primary" | "danger";

interface AppTextProps extends PropsWithChildren {
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  style?: StyleProp<TextStyle>;
  tone?: Tone;
  variant?: Variant;
}

const toneColors: Record<Tone, string> = {
  default: colorTokens.text,
  muted: colorTokens.mutedText,
  teal: colorTokens.teal,
  primary: colorTokens.primary,
  danger: colorTokens.danger,
};

export function AppText({
  children,
  headingLevel,
  style,
  tone = "default",
  variant = "body",
}: AppTextProps) {
  const { fontSize, fontWeight, letterSpacing, lineHeight } = typographyTokens[variant];
  // react-native-web renders role="heading" + aria-level as a real <h1>–<h6>; RN's types don't
  // declare aria-level, so it is passed through a spread.
  const headingProps = headingLevel
    ? { role: "heading" as const, "aria-level": headingLevel }
    : null;

  return (
    <Text
      {...headingProps}
      style={[{ color: toneColors[tone], fontSize, fontWeight, letterSpacing, lineHeight }, style]}
    >
      {children}
    </Text>
  );
}
