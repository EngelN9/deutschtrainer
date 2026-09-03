import type { PropsWithChildren, ReactNode } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colorTokens, radiusTokens, spacingTokens, typographyTokens } from "@deutschtrainer/ui";
import { useResponsiveLayout } from "../layout/useResponsiveLayout";
import { MainNavigation } from "./MainNavigation";

interface ContentScreenProps extends PropsWithChildren {
  action?: ReactNode;
  description?: string;
  eyebrow?: string;
  footer?: ReactNode;
  onBack?: () => void;
  showBack?: boolean;
  showMainNavigation?: boolean;
  title: string;
}

export function ContentScreen({
  action,
  children,
  description,
  eyebrow,
  footer,
  onBack,
  showBack = false,
  showMainNavigation = false,
  title,
}: ContentScreenProps) {
  const router = useRouter();
  const { isCompact, isMedium, isWide } = useResponsiveLayout();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={[styles.shell, isWide ? styles.wideShell : null]}>
        {showMainNavigation && isWide ? (
          <View style={styles.navigationRail}>
            <MainNavigation layout="rail" />
          </View>
        ) : null}
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.scrollContent,
            isCompact ? styles.compactScrollContent : null,
          ]}
          keyboardShouldPersistTaps="handled"
          style={styles.screen}
        >
          <View
            style={[
              styles.container,
              isMedium ? styles.mediumContainer : null,
              isWide ? styles.wideContainer : null,
            ]}
          >
            <View style={styles.topRow}>
              {showBack ? (
                <Pressable
                  accessibilityLabel="返回上一頁"
                  accessibilityRole="button"
                  onPress={onBack ?? router.back}
                  style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
                >
                  <ArrowLeft color={colorTokens.text} size={22} strokeWidth={2.2} />
                </Pressable>
              ) : (
                <View style={styles.iconSpacer} />
              )}
              <View style={styles.topAction}>{action}</View>
            </View>
            <View style={styles.header}>
              {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              {description ? (
                <Text selectable style={styles.description}>
                  {description}
                </Text>
              ) : null}
            </View>
            <View style={styles.body}>{children}</View>
          </View>
        </ScrollView>
        {footer ? <View style={styles.stickyFooter}>{footer}</View> : null}
        {showMainNavigation && !isWide ? (
          <View style={styles.navigationDock}>
            <MainNavigation />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacingTokens.lg,
  },
  container: {
    alignSelf: "center",
    maxWidth: 760,
    width: "100%",
  },
  compactScrollContent: {
    padding: spacingTokens.md,
    paddingBottom: spacingTokens.lg,
  },
  description: {
    color: colorTokens.mutedText,
    fontSize: typographyTokens.body.fontSize,
    lineHeight: typographyTokens.body.lineHeight,
  },
  eyebrow: {
    color: colorTokens.teal,
    fontSize: typographyTokens.caption.fontSize,
    fontWeight: "800",
    letterSpacing: 0.4,
    lineHeight: typographyTokens.caption.lineHeight,
  },
  header: {
    gap: spacingTokens.sm,
    marginBottom: spacingTokens.lg,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  iconSpacer: {
    height: 44,
    width: 44,
  },
  pressed: {
    opacity: 0.72,
  },
  safeArea: {
    backgroundColor: colorTokens.background,
    flex: 1,
  },
  screen: {
    backgroundColor: colorTokens.background,
    flex: 1,
  },
  stickyFooter: {
    backgroundColor: colorTokens.surface,
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
    paddingHorizontal: spacingTokens.md,
    paddingVertical: spacingTokens.sm,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacingTokens.lg,
    paddingBottom: spacingTokens.xl,
  },
  mediumContainer: {
    maxWidth: 900,
  },
  navigationDock: {
    backgroundColor: colorTokens.surface,
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
    paddingHorizontal: spacingTokens.sm,
    paddingVertical: spacingTokens.sm,
  },
  navigationRail: {
    backgroundColor: colorTokens.background,
    borderRightColor: colorTokens.border,
    borderRightWidth: 1,
    padding: spacingTokens.md,
    width: 184,
  },
  shell: {
    flex: 1,
  },
  title: {
    color: colorTokens.text,
    fontSize: typographyTokens.title.fontSize,
    fontWeight: typographyTokens.title.fontWeight,
    lineHeight: typographyTokens.title.lineHeight,
  },
  topAction: {
    alignItems: "flex-end",
    flex: 1,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacingTokens.md,
    minHeight: 44,
  },
  wideContainer: {
    maxWidth: 1120,
  },
  wideShell: {
    flexDirection: "row",
  },
});
