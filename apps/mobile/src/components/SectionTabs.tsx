import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, radiusTokens, spacingTokens, typographyTokens } from "@deutschtrainer/ui";
import type { NavigationSection } from "../navigation/navigationPolicy";

interface SectionTabsProps {
  activePath: string;
  sections: readonly NavigationSection[];
}

// Pages that share one main tab (for example 寫作 and 聽說 under 練習) stay one tap apart.
export function SectionTabs({ activePath, sections }: SectionTabsProps) {
  const router = useRouter();

  if (sections.length < 2) {
    return null;
  }

  return (
    <View accessibilityRole="tablist" style={styles.row}>
      {sections.map((section) => {
        const active = section.path === activePath;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            aria-selected={active}
            key={section.path}
            onPress={() => router.navigate(section.path as Href)}
            style={({ pressed }) => [
              styles.tab,
              active ? styles.activeTab : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.label, active ? styles.activeLabel : null]}>{section.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  activeLabel: {
    color: colorTokens.primary,
  },
  activeTab: {
    backgroundColor: colorTokens.primarySoft,
    borderColor: colorTokens.primary,
  },
  label: {
    color: colorTokens.mutedText,
    fontSize: typographyTokens.label.fontSize,
    fontWeight: typographyTokens.label.fontWeight,
    lineHeight: typographyTokens.label.lineHeight,
  },
  pressed: {
    opacity: 0.72,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.sm,
  },
  tab: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacingTokens.md,
  },
});
