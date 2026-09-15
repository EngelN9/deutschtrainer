import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AppText } from "./AppText";

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
  header: {
    gap: spacingTokens.sm,
    marginBottom: spacingTokens.xl,
  },
  screen: {
    backgroundColor: colorTokens.background,
    flex: 1,
  },
});
