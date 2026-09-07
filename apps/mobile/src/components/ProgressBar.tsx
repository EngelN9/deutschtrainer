import { StyleSheet, View } from "react-native";
import { colorTokens, radiusTokens } from "@deutschtrainer/ui";

interface ProgressBarProps {
  accessibilityLabel: string;
  percent: number;
  tone?: "primary" | "success";
}

export function ProgressBar({ accessibilityLabel, percent, tone = "primary" }: ProgressBarProps) {
  const safePercent = Math.min(100, Math.max(0, percent));

  return (
    <View
      accessibilityLabel={`${accessibilityLabel} ${safePercent}%`}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: safePercent }}
      style={styles.track}
    >
      <View
        style={[
          styles.fill,
          tone === "success" ? styles.success : styles.primary,
          { width: `${safePercent}%` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    borderRadius: radiusTokens.pill,
    height: 8,
  },
  primary: {
    backgroundColor: colorTokens.primary,
  },
  success: {
    backgroundColor: colorTokens.success,
  },
  track: {
    backgroundColor: colorTokens.border,
    borderRadius: radiusTokens.pill,
    height: 8,
    overflow: "hidden",
    width: "100%",
  },
});
