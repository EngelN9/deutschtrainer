import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { colorTokens, radiusTokens, spacingTokens } from "@deutschtrainer/ui";
import { AppText } from "./AppText";

type StatusTone = "neutral" | "primary" | "success" | "warning" | "danger" | "offline";

interface StatusChipProps extends PropsWithChildren {
  tone?: StatusTone;
}

const toneStyles = {
  neutral: {
    backgroundColor: colorTokens.restrictedSoft,
    borderColor: colorTokens.restrictedBorder,
  },
  primary: { backgroundColor: colorTokens.primarySoft, borderColor: colorTokens.primary },
  success: { backgroundColor: colorTokens.successSoft, borderColor: colorTokens.success },
  warning: { backgroundColor: colorTokens.warningSoft, borderColor: colorTokens.warning },
  danger: { backgroundColor: colorTokens.dangerSoft, borderColor: colorTokens.danger },
  offline: { backgroundColor: colorTokens.offlineSoft, borderColor: colorTokens.offline },
} as const;

const textColors: Record<StatusTone, string> = {
  neutral: colorTokens.restricted,
  primary: colorTokens.primaryDark,
  success: colorTokens.success,
  warning: colorTokens.warning,
  danger: colorTokens.danger,
  offline: colorTokens.offlineDark,
};

export function StatusChip({ children, tone = "neutral" }: StatusChipProps) {
  return (
    <View style={[styles.chip, toneStyles[tone]]}>
      <AppText style={{ color: textColors[tone] }} variant="caption">
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    borderRadius: radiusTokens.pill,
    borderWidth: 1,
    paddingHorizontal: spacingTokens.sm,
    paddingVertical: spacingTokens.xs,
  },
});
