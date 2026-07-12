import type { CefrLevel } from "@deutschtrainer/shared-types";
import { SUPPORTED_LEVELS } from "@deutschtrainer/shared-types";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";

interface LevelSelectorProps {
  onChange: (level: CefrLevel) => void;
  value: CefrLevel;
}

export function LevelSelector({ onChange, value }: LevelSelectorProps) {
  return (
    <View accessibilityRole="tablist" style={styles.control}>
      {SUPPORTED_LEVELS.map((level) => {
        const active = level === value;

        return (
          <Pressable
            accessibilityLabel={`德語 ${level}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={level}
            onPress={() => onChange(level)}
            style={({ pressed }) => [
              styles.option,
              active ? styles.activeOption : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.text, active ? styles.activeText : null]}>{level}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  activeOption: {
    backgroundColor: colorTokens.text,
  },
  activeText: {
    color: "#FFFFFF",
  },
  control: {
    backgroundColor: colorTokens.subtle,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacingTokens.xs,
    padding: spacingTokens.xs,
  },
  option: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.72,
  },
  text: {
    color: colorTokens.mutedText,
    fontSize: 15,
    fontWeight: "800",
  },
});
