import type { PropsWithChildren, ReactNode } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "lucide-react-native";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { useResponsiveLayout } from "../layout/useResponsiveLayout";
import { AppText } from "./AppText";
import { IconButton } from "./IconButton";
import { MainNavigation, useMainNavigation } from "./MainNavigation";
import { SectionTabs } from "./SectionTabs";

interface ContentScreenProps extends PropsWithChildren {
  action?: ReactNode;
  description?: string;
  eyebrow?: string;
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
  onBack,
  showBack = false,
  showMainNavigation = false,
  title,
}: ContentScreenProps) {
  const router = useRouter();
  const { isCompact, isMedium, isWide } = useResponsiveLayout();
  const { activeGroup, pathname } = useMainNavigation();

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
          contentContainerStyle={[
            styles.scrollContent,
            isCompact ? styles.compactScrollContent : null,
          ]}
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
                <IconButton
                  accessibilityLabel="返回上一頁"
                  icon={ArrowLeft}
                  onPress={onBack ?? router.back}
                />
              ) : (
                <View style={styles.iconSpacer} />
              )}
              <View style={styles.topAction}>{action}</View>
            </View>
            <View style={styles.header}>
              {eyebrow ? (
                <AppText tone="teal" variant="label">
                  {eyebrow}
                </AppText>
              ) : null}
              <AppText headingLevel={1} variant="title">
                {title}
              </AppText>
              {description ? <AppText tone="muted">{description}</AppText> : null}
            </View>
            {showMainNavigation && activeGroup ? (
              <View style={styles.sectionTabs}>
                <SectionTabs activePath={pathname} sections={activeGroup.sections} />
              </View>
            ) : null}
            <View style={styles.body}>{children}</View>
          </View>
        </ScrollView>
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
  header: {
    gap: spacingTokens.sm,
    marginBottom: spacingTokens.lg,
  },
  iconSpacer: {
    height: 44,
    width: 44,
  },
  safeArea: {
    backgroundColor: colorTokens.background,
    flex: 1,
  },
  screen: {
    backgroundColor: colorTokens.background,
    flex: 1,
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
    backgroundColor: colorTokens.background,
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
    paddingHorizontal: spacingTokens.sm,
    paddingVertical: spacingTokens.xs,
  },
  navigationRail: {
    backgroundColor: colorTokens.background,
    borderRightColor: colorTokens.border,
    borderRightWidth: 1,
    padding: spacingTokens.md,
    width: 184,
  },
  sectionTabs: {
    marginBottom: spacingTokens.lg,
  },
  shell: {
    flex: 1,
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
