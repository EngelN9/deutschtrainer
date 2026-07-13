import type { SpeechComparisonChange } from "@deutschtrainer/shared-types";
import { StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";

export function WordComparisonView({ changes }: { changes: SpeechComparisonChange[] }) {
  return (
    <View style={styles.container}>
      {changes.map((change, index) => (
        <Text
          key={`${change.kind}-${index}-${change.value}`}
          style={[
            styles.word,
            change.kind === "missing" ? styles.missing : null,
            change.kind === "extra" ? styles.extra : null,
          ]}
        >
          {change.value}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", flexWrap: "wrap", gap: spacingTokens.xs },
  extra: {
    backgroundColor: "#FFF1F2",
    color: colorTokens.danger,
    textDecorationLine: "line-through",
  },
  missing: { backgroundColor: "#FFF7D6", color: "#8A5A00", textDecorationLine: "underline" },
  word: {
    backgroundColor: "#EAF7F2",
    borderRadius: 4,
    color: colorTokens.text,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: spacingTokens.xs,
    paddingVertical: 2,
  },
});
