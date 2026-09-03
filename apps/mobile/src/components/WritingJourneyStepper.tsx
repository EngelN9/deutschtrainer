import { Check } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { colorTokens, radiusTokens, spacingTokens } from "@deutschtrainer/ui";

export type WritingJourneyStage = "draft" | "issues" | "rewrite" | "compare";

const stages: Array<{ key: WritingJourneyStage; label: string; shortLabel: string }> = [
  { key: "draft", label: "完成草稿", shortLabel: "草稿" },
  { key: "issues", label: "查看三個重點", shortLabel: "重點" },
  { key: "rewrite", label: "完成重寫", shortLabel: "重寫" },
  { key: "compare", label: "比較版本", shortLabel: "比較" },
];

export function WritingJourneyStepper({ current }: { current: WritingJourneyStage }) {
  const currentIndex = stages.findIndex((stage) => stage.key === current);

  return (
    <View
      accessibilityLabel={`寫作流程，目前步驟：${stages[currentIndex]?.label ?? "草稿"}`}
      style={styles.container}
    >
      {stages.map((stage, index) => {
        const complete = index < currentIndex;
        const active = index === currentIndex;
        return (
          <View key={stage.key} style={styles.stepWrap}>
            <View style={styles.step}>
              <View
                style={[
                  styles.marker,
                  complete ? styles.completeMarker : null,
                  active ? styles.activeMarker : null,
                ]}
              >
                {complete ? (
                  <Check color={colorTokens.onStrong} size={14} strokeWidth={3} />
                ) : (
                  <Text style={[styles.markerText, active ? styles.activeMarkerText : null]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text style={[styles.label, active ? styles.activeLabel : null]}>
                {stage.shortLabel}
              </Text>
            </View>
            {index < stages.length - 1 ? (
              <View style={[styles.connector, complete ? styles.completeConnector : null]} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  activeLabel: { color: colorTokens.primaryDark },
  activeMarker: { backgroundColor: colorTokens.primary, borderColor: colorTokens.primary },
  activeMarkerText: { color: colorTokens.onStrong },
  completeConnector: { backgroundColor: colorTokens.primary },
  completeMarker: { backgroundColor: colorTokens.primary, borderColor: colorTokens.primary },
  connector: {
    backgroundColor: colorTokens.border,
    flex: 1,
    height: 2,
    marginHorizontal: spacingTokens.xs,
    marginTop: 15,
  },
  container: {
    alignItems: "flex-start",
    flexDirection: "row",
    width: "100%",
  },
  label: {
    color: colorTokens.mutedText,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  marker: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.borderStrong,
    borderRadius: radiusTokens.pill,
    borderWidth: 2,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  markerText: { color: colorTokens.mutedText, fontSize: 12, fontWeight: "900" },
  step: { alignItems: "center", gap: spacingTokens.xs },
  stepWrap: { flex: 1, flexDirection: "row" },
});
