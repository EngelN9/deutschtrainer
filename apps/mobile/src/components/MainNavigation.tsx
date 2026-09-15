import type { Href } from "expo-router";
import { usePathname, useRouter } from "expo-router";
import { BookOpen, FilePenLine, Home, Presentation, RotateCcw } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, radiusTokens, spacingTokens, typographyTokens } from "@deutschtrainer/ui";
import { useAuthStore } from "../features/auth/useAuthStore";
import { mobileEnv } from "../lib/env";
import {
  findActiveGroup,
  getNavigationGroups,
  type NavigationGroupId,
} from "../navigation/navigationPolicy";

const icons: Record<NavigationGroupId, typeof Home> = {
  today: Home,
  learn: BookOpen,
  practice: FilePenLine,
  classroom: Presentation,
  progress: RotateCcw,
};

export function useMainNavigation() {
  const pathname = usePathname();
  const authMode = useAuthStore((state) => state.authMode);
  // The classroom route stays reachable by URL while the flag is off; the flag only decides
  // whether it is advertised. The API allowlists real learner profiles either way.
  const groups = getNavigationGroups(authMode, mobileEnv.classroomEnabled);
  return { activeGroup: findActiveGroup(groups, pathname), groups, pathname };
}

export function MainNavigation({ layout = "bar" }: { layout?: "bar" | "rail" }) {
  const router = useRouter();
  const { activeGroup, groups } = useMainNavigation();
  const isRail = layout === "rail";

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.navigation, isRail ? styles.railNavigation : styles.barNavigation]}
    >
      {groups.map((group) => {
        const active = group.id === activeGroup?.id;
        const Icon = icons[group.id];

        return (
          <Pressable
            accessibilityLabel={group.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            // react-native-web 0.21 no longer maps accessibilityState.selected to aria-selected.
            aria-selected={active}
            key={group.id}
            // navigate returns to a page already in the stack instead of piling up tab visits, so
            // the back button keeps working without an ever-growing history.
            onPress={() => router.navigate(group.sections[0].path as Href)}
            style={({ pressed }) => [
              styles.item,
              isRail ? styles.railItem : styles.barItem,
              active ? styles.activeItem : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Icon
              color={active ? colorTokens.primary : colorTokens.mutedText}
              size={20}
              strokeWidth={2}
            />
            <Text style={[styles.label, active ? styles.activeLabel : null]}>{group.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  activeItem: {
    backgroundColor: colorTokens.primarySoft,
  },
  activeLabel: {
    color: colorTokens.primary,
  },
  barItem: {
    flex: 1,
  },
  barNavigation: {
    flexDirection: "row",
  },
  item: {
    alignItems: "center",
    borderRadius: radiusTokens.sm,
    gap: spacingTokens.xs,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: spacingTokens.xs,
  },
  label: {
    color: colorTokens.mutedText,
    fontSize: typographyTokens.caption.fontSize,
    fontWeight: typographyTokens.caption.fontWeight,
    lineHeight: typographyTokens.caption.lineHeight,
  },
  navigation: {
    gap: spacingTokens.xs,
    width: "100%",
  },
  pressed: {
    opacity: 0.72,
  },
  railItem: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
    minHeight: 48,
    paddingHorizontal: spacingTokens.md,
  },
  railNavigation: {
    flexDirection: "column",
  },
});
