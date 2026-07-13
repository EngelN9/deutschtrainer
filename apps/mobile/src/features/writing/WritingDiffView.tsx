import { useMemo } from "react";
import { diffWordsWithSpace, type Change } from "diff";
import { StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";

interface WritingDiffViewProps {
  currentLabel: string;
  currentText: string;
  previousLabel: string;
  previousText: string;
}

export function WritingDiffView({
  currentLabel,
  currentText,
  previousLabel,
  previousText,
}: WritingDiffViewProps) {
  const changes = useMemo(
    () => diffWordsWithSpace(previousText, currentText),
    [currentText, previousText],
  );

  return (
    <View style={styles.comparison}>
      <DiffPanel changes={changes} label={previousLabel} mode="previous" />
      <DiffPanel changes={changes} label={currentLabel} mode="current" />
    </View>
  );
}

function DiffPanel({
  changes,
  label,
  mode,
}: {
  changes: Change[];
  label: string;
  mode: "previous" | "current";
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.label}>{label}</Text>
      <Text selectable style={styles.text}>
        {changes.map((change, index) => {
          if ((mode === "previous" && change.added) || (mode === "current" && change.removed)) {
            return null;
          }
          const changed = mode === "previous" ? change.removed : change.added;
          return (
            <Text
              key={`${mode}-${index}`}
              style={[
                changed ? styles.changed : null,
                mode === "previous" && changed ? styles.removed : null,
                mode === "current" && changed ? styles.added : null,
              ]}
            >
              {change.value}
            </Text>
          );
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  added: {
    backgroundColor: "#DCFCE7",
    color: colorTokens.success,
  },
  changed: {
    fontWeight: "700",
  },
  comparison: {
    gap: spacingTokens.md,
  },
  label: {
    color: colorTokens.mutedText,
    fontSize: 13,
    fontWeight: "800",
  },
  panel: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacingTokens.sm,
    padding: spacingTokens.md,
  },
  removed: {
    backgroundColor: "#FEE2E2",
    color: colorTokens.danger,
    textDecorationLine: "line-through",
  },
  text: {
    color: colorTokens.text,
    fontSize: 16,
    lineHeight: 27,
  },
});
