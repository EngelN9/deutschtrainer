import { StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";

interface TagListProps {
  emptyText?: string;
  items: string[];
}

export function TagList({ emptyText = "無", items }: TagListProps) {
  if (items.length === 0) {
    return <Text style={styles.empty}>{emptyText}</Text>;
  }

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item} style={styles.tag}>
          <Text style={styles.text}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: colorTokens.mutedText,
    fontSize: 14,
  },
  list: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.sm,
  },
  tag: {
    backgroundColor: colorTokens.subtle,
    borderColor: colorTokens.border,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: spacingTokens.sm,
    paddingVertical: 6,
  },
  text: {
    color: colorTokens.text,
    fontSize: 13,
    lineHeight: 18,
  },
});
