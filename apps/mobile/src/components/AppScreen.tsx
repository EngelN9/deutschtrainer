import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colorTokens, spacingTokens, typographyTokens } from "@deutschtrainer/ui";

interface AppScreenProps extends PropsWithChildren {
  description?: string;
  eyebrow?: string;
  title: string;
}

export function AppScreen({ children, description, eyebrow, title }: AppScreenProps) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      style={styles.screen}
    >
      <StatusBar style="dark" />
      <View style={styles.container}>
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
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacingTokens.md,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacingTokens.lg,
  },
  container: {
    alignSelf: "center",
    maxWidth: 620,
    width: "100%",
  },
  description: {
    color: colorTokens.mutedText,
    fontSize: typographyTokens.body.fontSize,
    lineHeight: typographyTokens.body.lineHeight,
  },
  eyebrow: {
    color: colorTokens.primary,
    fontSize: typographyTokens.caption.fontSize,
    fontWeight: "800",
    letterSpacing: 0.4,
    lineHeight: typographyTokens.caption.lineHeight,
  },
  header: {
    gap: spacingTokens.sm,
    marginBottom: spacingTokens.xl,
  },
  screen: {
    backgroundColor: colorTokens.background,
    flex: 1,
  },
  title: {
    color: colorTokens.text,
    fontSize: typographyTokens.title.fontSize,
    fontWeight: typographyTokens.title.fontWeight,
    lineHeight: typographyTokens.title.lineHeight,
  },
});
