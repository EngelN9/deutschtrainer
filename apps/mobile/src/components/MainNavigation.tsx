import type { Href } from "expo-router";
import { usePathname, useRouter } from "expo-router";
import { BookOpen, Home } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";

const items: Array<{
  href: Href;
  icon: typeof Home;
  label: string;
  path: string;
}> = [
  { href: "/home", icon: Home, label: "首頁", path: "/home" },
  { href: "/courses", icon: BookOpen, label: "課程", path: "/courses" },
];

export function MainNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View accessibilityRole="tablist" style={styles.navigation}>
      {items.map((item) => {
        const active = pathname === item.path;
        const Icon = item.icon;

        return (
          <Pressable
            accessibilityLabel={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={item.path}
            onPress={() => router.replace(item.href)}
            style={({ pressed }) => [
              styles.item,
              active ? styles.activeItem : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Icon color={active ? colorTokens.primary : colorTokens.mutedText} size={20} />
            <Text style={[styles.label, active ? styles.activeLabel : null]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  activeItem: {
    backgroundColor: "#E8F0FE",
  },
  activeLabel: {
    color: colorTokens.primary,
  },
  item: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: spacingTokens.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacingTokens.sm,
  },
  label: {
    color: colorTokens.mutedText,
    fontSize: 14,
    fontWeight: "700",
  },
  navigation: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.sm,
    marginTop: spacingTokens.md,
    padding: spacingTokens.xs,
  },
  pressed: {
    opacity: 0.72,
  },
});
