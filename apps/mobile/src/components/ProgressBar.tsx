import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { colorTokens, resolveDuration, springTokens } from "@deutschtrainer/ui";

interface ProgressBarProps {
  accessibilityLabel: string;
  percent: number;
  tone?: "primary" | "success";
}

export function ProgressBar({ accessibilityLabel, percent, tone = "primary" }: ProgressBarProps) {
  const safePercent = Math.min(100, Math.max(0, percent));
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(safePercent);

  useEffect(() => {
    fill.value = reduceMotion
      ? withTiming(safePercent, { duration: resolveDuration("instant", true) })
      : withSpring(safePercent, springTokens.progress);
  }, [fill, reduceMotion, safePercent]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` }));

  return (
    <View
      accessibilityLabel={`${accessibilityLabel} ${safePercent}%`}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: safePercent }}
      style={styles.track}
    >
      <Animated.View
        style={[
          styles.fill,
          tone === "success" ? styles.success : styles.primary,
          fillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    borderRadius: 3,
    height: 6,
  },
  primary: {
    backgroundColor: colorTokens.primary,
  },
  success: {
    backgroundColor: colorTokens.success,
  },
  track: {
    backgroundColor: "#DDE3EA",
    borderRadius: 3,
    height: 6,
    overflow: "hidden",
    width: "100%",
  },
});
