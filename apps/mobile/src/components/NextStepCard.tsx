import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { colorTokens, radiusTokens, spacingTokens } from "@deutschtrainer/ui";
import { AppText } from "./AppText";
import { PrimaryButton } from "./PrimaryButton";

interface NextStepCardProps {
  accessibilityLabel: string;
  actionLabel: string;
  description: string;
  eyebrow: string;
  icon: LucideIcon;
  loading?: boolean;
  meta?: string;
  onPress: () => void;
  title: string;
}

export function NextStepCard({
  accessibilityLabel,
  actionLabel,
  description,
  eyebrow,
  icon: Icon,
  loading = false,
  meta,
  onPress,
  title,
}: NextStepCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.icon}
        >
          <Icon color={colorTokens.onStrong} size={24} strokeWidth={2.2} />
        </View>
        <View style={styles.copy}>
          <AppText tone="primary" variant="label">
            {eyebrow}
          </AppText>
          <AppText headingLevel={2} variant="heading">
            {title}
          </AppText>
        </View>
      </View>
      <AppText>{description}</AppText>
      {meta ? (
        <AppText tone="muted" variant="bodySmall">
          {meta}
        </AppText>
      ) : null}
      <PrimaryButton accessibilityLabel={accessibilityLabel} loading={loading} onPress={onPress}>
        {actionLabel}
      </PrimaryButton>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorTokens.primarySoft,
    borderColor: colorTokens.primary,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    gap: spacingTokens.md,
    padding: spacingTokens.lg,
  },
  copy: { flex: 1, gap: spacingTokens.xs, minWidth: 0 },
  heading: { alignItems: "center", flexDirection: "row", gap: spacingTokens.md },
  icon: {
    alignItems: "center",
    backgroundColor: colorTokens.primary,
    borderRadius: radiusTokens.sm,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
});
