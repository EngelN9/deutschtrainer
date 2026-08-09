import type { ReactNode } from "react";
import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { colorTokens } from "@deutschtrainer/ui";

export function AuthLink({ children, href }: { children: ReactNode; href: Href }) {
  return (
    <Link asChild href={href}>
      <Pressable accessibilityRole="link" style={styles.target}>
        <Text style={styles.label}>{children}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colorTokens.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  target: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    width: "100%",
  },
});
