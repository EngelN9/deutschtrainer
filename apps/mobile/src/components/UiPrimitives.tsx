import type { PropsWithChildren, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, Text, View } from "react-native";
import {
  colorTokens,
  elevationTokens,
  radiusTokens,
  spacingTokens,
  typographyTokens,
} from "@deutschtrainer/ui";

type CardTone = "default" | "highlight" | "accent" | "quiet";

interface SurfaceCardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  tone?: CardTone;
}

export function SurfaceCard({ children, style, tone = "default" }: SurfaceCardProps) {
  return (
    <View
      style={[
        styles.card,
        tone === "highlight" ? styles.highlightCard : null,
        tone === "accent" ? styles.accentCard : null,
        tone === "quiet" ? styles.quietCard : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function StatusBadge({
  children,
  tone = "primary",
}: PropsWithChildren<{ tone?: "primary" | "accent" | "success" | "warning" | "neutral" }>) {
  return (
    <View
      style={[
        styles.badge,
        tone === "primary" ? styles.primaryBadge : null,
        tone === "accent" ? styles.accentBadge : null,
        tone === "success" ? styles.successBadge : null,
        tone === "warning" ? styles.warningBadge : null,
        tone === "neutral" ? styles.neutralBadge : null,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          tone === "primary" ? styles.primaryBadgeText : null,
          tone === "accent" ? styles.accentBadgeText : null,
          tone === "success" ? styles.successBadgeText : null,
          tone === "warning" ? styles.warningBadgeText : null,
          tone === "neutral" ? styles.neutralBadgeText : null,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

export function SectionHeader({
  action,
  description,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
        {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

export function EmptyState({
  action,
  icon,
  message,
  title,
}: {
  action?: ReactNode;
  icon?: ReactNode;
  message: string;
  title: string;
}) {
  return (
    <SurfaceCard style={styles.emptyState} tone="quiet">
      {icon ? <View style={styles.emptyIcon}>{icon}</View> : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  accentBadge: { backgroundColor: colorTokens.accentSoft },
  accentBadgeText: { color: colorTokens.accent },
  accentCard: {
    backgroundColor: colorTokens.accentSoft,
    borderColor: "#F6C8A6",
  },
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radiusTokens.pill,
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: spacingTokens.sm,
    paddingVertical: spacingTokens.xs,
  },
  badgeText: {
    fontSize: typographyTokens.caption.fontSize,
    fontWeight: typographyTokens.caption.fontWeight,
    lineHeight: typographyTokens.caption.lineHeight,
  },
  card: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.lg,
    borderWidth: 1,
    boxShadow: elevationTokens.raised,
    gap: spacingTokens.md,
    padding: spacingTokens.lg,
  },
  emptyAction: { marginTop: spacingTokens.sm, minWidth: 180 },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: colorTokens.primarySoft,
    borderRadius: radiusTokens.pill,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  emptyMessage: {
    color: colorTokens.mutedText,
    fontSize: typographyTokens.bodySmall.fontSize,
    lineHeight: typographyTokens.bodySmall.lineHeight,
    maxWidth: 420,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    boxShadow: undefined,
    minHeight: 220,
    justifyContent: "center",
  },
  emptyTitle: {
    color: colorTokens.text,
    fontSize: typographyTokens.subheading.fontSize,
    fontWeight: typographyTokens.subheading.fontWeight,
    lineHeight: typographyTokens.subheading.lineHeight,
    textAlign: "center",
  },
  eyebrow: {
    color: colorTokens.teal,
    fontSize: typographyTokens.caption.fontSize,
    fontWeight: "800",
    letterSpacing: 0.3,
    lineHeight: typographyTokens.caption.lineHeight,
  },
  highlightCard: {
    backgroundColor: colorTokens.primarySoft,
    borderColor: "#B8D0FF",
  },
  neutralBadge: { backgroundColor: colorTokens.subtle },
  neutralBadgeText: { color: colorTokens.mutedText },
  primaryBadge: { backgroundColor: colorTokens.primarySoft },
  primaryBadgeText: { color: colorTokens.primaryDark },
  quietCard: { backgroundColor: colorTokens.surfaceMuted },
  sectionCopy: { flex: 1, gap: spacingTokens.xs, minWidth: 0 },
  sectionDescription: {
    color: colorTokens.mutedText,
    fontSize: typographyTokens.bodySmall.fontSize,
    lineHeight: typographyTokens.bodySmall.lineHeight,
  },
  sectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacingTokens.md,
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colorTokens.text,
    fontSize: typographyTokens.subheading.fontSize,
    fontWeight: typographyTokens.subheading.fontWeight,
    lineHeight: typographyTokens.subheading.lineHeight,
  },
  successBadge: { backgroundColor: colorTokens.successSoft },
  successBadgeText: { color: colorTokens.success },
  warningBadge: { backgroundColor: colorTokens.warningSoft },
  warningBadgeText: { color: colorTokens.warning },
});
