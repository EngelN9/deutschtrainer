import type { PropsWithChildren, ReactNode } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";

interface ContentScreenProps extends PropsWithChildren {
  action?: ReactNode;
  description?: string;
  eyebrow?: string;
  onBack?: () => void;
  showBack?: boolean;
  title: string;
}

export function ContentScreen({
  action,
  children,
  description,
  eyebrow,
  onBack,
  showBack = false,
  title,
}: ContentScreenProps) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.screen}>
        <View style={styles.container}>
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
            <Text style={styles.title}>{title}</Text>
            {description ? <Text style={styles.description}>{description}</Text> : null}
          </View>
          <View style={styles.body}>{children}</View>
        </View>
      </ScrollView>
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
  description: {
    color: colorTokens.mutedText,
    fontSize: 16,
    lineHeight: 24,
  },
  eyebrow: {
    color: colorTokens.teal,
    fontSize: 13,
    fontWeight: "800",
  },
  header: {
    gap: spacingTokens.sm,
    marginBottom: spacingTokens.lg,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
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
  scrollContent: {
    flexGrow: 1,
    padding: spacingTokens.lg,
    paddingBottom: spacingTokens.xl,
  },
  title: {
    color: colorTokens.text,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 38,
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
});
