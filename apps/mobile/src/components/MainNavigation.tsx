import type { Href } from "expo-router";
import { usePathname, useRouter } from "expo-router";
import {
  BarChart3,
  BookOpen,
  FilePenLine,
  Headphones,
  Home,
  Library,
  RotateCcw,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { useAuthStore } from "../features/auth/useAuthStore";

const items: Array<{
  href: Href;
  icon: typeof Home;
  label: string;
  path: string;
}> = [
  { href: "/home", icon: Home, label: "首頁", path: "/home" },
  { href: "/courses", icon: BookOpen, label: "課程", path: "/courses" },
  { href: "/knowledge" as Href, icon: Library, label: "知識", path: "/knowledge" },
  { href: "/writing" as Href, icon: FilePenLine, label: "寫作", path: "/writing" },
  { href: "/audio-training" as Href, icon: Headphones, label: "聽說", path: "/audio-training" },
  { href: "/reviews" as Href, icon: RotateCcw, label: "複習", path: "/reviews" },
  { href: "/analytics" as Href, icon: BarChart3, label: "分析", path: "/analytics" },
];

export function MainNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const authMode = useAuthStore((state) => state.authMode);
  const visibleItems =
    authMode === "demo"
      ? items.filter((item) => ["/home", "/courses", "/reviews"].includes(item.path))
      : items;

  return (
    <View accessibilityRole="tablist" style={styles.navigation}>
      {visibleItems.map((item) => {
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
    gap: spacingTokens.xs,
    justifyContent: "center",
    minHeight: 58,
    minWidth: 0,
    paddingHorizontal: spacingTokens.xs,
  },
  label: {
    color: colorTokens.mutedText,
    fontSize: 12,
    fontWeight: "700",
  },
  navigation: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.xs,
    marginTop: spacingTokens.md,
    padding: spacingTokens.xs,
  },
  pressed: {
    opacity: 0.72,
  },
});
