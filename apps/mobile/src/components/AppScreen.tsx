import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";

interface AppScreenProps extends PropsWithChildren {
  description?: string;
  eyebrow?: string;
  title: string;
}

export function AppScreen({ children, description, eyebrow, title }: AppScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <View style={styles.body}>{children}</View>
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
  description: {
    color: colorTokens.mutedText,
    fontSize: 16,
    lineHeight: 24,
  },
  eyebrow: {
    color: colorTokens.primary,
    fontSize: 13,
    fontWeight: "700",
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
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 38,
  },
});
