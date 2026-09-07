import type { Href } from "expo-router";
import { usePathname, useRouter } from "expo-router";
import {
  BarChart3,
  BookOpen,
  FilePenLine,
  Headphones,
  Home,
  LayoutGrid,
  Library,
  RotateCcw,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, radiusTokens, spacingTokens } from "@deutschtrainer/ui";
import { useAuthStore } from "../features/auth/useAuthStore";
import {
  getPrimaryNavigationItems,
  isNavigationItemActive,
  type Capability,
} from "../navigation/navigationPolicy";

const icons: Record<Capability, LucideIcon> = {
  analytics: BarChart3,
  audio: Headphones,
  courses: BookOpen,
  home: Home,
  knowledge: Library,
  more: LayoutGrid,
  offline: LayoutGrid,
  reviews: RotateCcw,
  settings: LayoutGrid,
  writing: FilePenLine,
};

export function MainNavigation({ layout = "bar" }: { layout?: "bar" | "rail" }) {
  const pathname = usePathname();
  const router = useRouter();
  const authMode = useAuthStore((state) => state.authMode);
  const visibleItems = getPrimaryNavigationItems(authMode, layout);

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.navigation, layout === "rail" ? styles.railNavigation : styles.barNavigation]}
    >
      {visibleItems.map((item) => {
        const active = isNavigationItemActive(item, pathname);
        const Icon = icons[item.capability];

        return (
          <Pressable
            accessibilityLabel={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={item.capability}
            onPress={() => router.replace(item.href as Href)}
            style={({ pressed }) => [
              styles.item,
              layout === "rail" ? styles.railItem : styles.barItem,
              active ? styles.activeItem : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Icon
              color={active ? colorTokens.primary : colorTokens.mutedText}
              size={layout === "rail" ? 20 : 21}
              strokeWidth={active ? 2.6 : 2.1}
            />
            <Text numberOfLines={1} style={[styles.label, active ? styles.activeLabel : null]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  activeItem: { backgroundColor: colorTokens.primarySoft },
  activeLabel: { color: colorTokens.primaryDark },
  barItem: { flex: 1, minWidth: 0 },
  barNavigation: { flexDirection: "row", width: "100%" },
  item: {
    alignItems: "center",
    borderRadius: radiusTokens.md,
    gap: spacingTokens.xs,
    justifyContent: "center",
    minHeight: 58,
    minWidth: 44,
    paddingHorizontal: spacingTokens.xs,
  },
  label: { color: colorTokens.mutedText, fontSize: 12, fontWeight: "800" },
  navigation: { gap: spacingTokens.xs },
  pressed: { opacity: 0.72 },
  railItem: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
    minHeight: 48,
    paddingHorizontal: spacingTokens.md,
    width: "100%",
  },
  railNavigation: { flexDirection: "column", width: "100%" },
});
