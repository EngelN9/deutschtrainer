import type { PropsWithChildren } from "react";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { PlayCircle } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { KnowledgeExerciseLink } from "@deutschtrainer/shared-types";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";

export function KnowledgeDetailSection({ children, title }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function KnowledgeMetaGrid({ items }: { items: Array<{ label: string; value?: string }> }) {
  const visibleItems = items.filter((item): item is { label: string; value: string } =>
    Boolean(item.value),
  );
  return (
    <View style={styles.metaGrid}>
      {visibleItems.map((item) => (
        <View key={item.label} style={styles.metaItem}>
          <Text style={styles.metaLabel}>{item.label}</Text>
          <Text style={styles.metaValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function RelatedExerciseList({ items }: { items: KnowledgeExerciseLink[] }) {
  const router = useRouter();
  if (items.length === 0) {
    return <Text style={styles.emptyText}>目前沒有直接關聯的已發布練習。</Text>;
  }

  return (
    <View style={styles.exerciseList}>
      {items.map((item) => (
        <Pressable
          accessibilityLabel={`開始練習 ${item.title}`}
          accessibilityRole="button"
          key={item.id}
          onPress={() =>
            router.push({
              pathname: "/exercise/[lessonId]",
              params: { lessonId: item.lessonId, exerciseId: item.id },
            } as Href)
          }
          style={({ pressed }) => [styles.exercise, pressed ? styles.pressed : null]}
        >
          <View style={styles.exerciseCopy}>
            <Text style={styles.exerciseTitle}>{item.title}</Text>
            <Text style={styles.exerciseMeta}>
              {item.level} · {item.lessonTitleZhTw}
            </Text>
          </View>
          <PlayCircle color={colorTokens.primary} size={24} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: { color: colorTokens.mutedText, fontSize: 14, lineHeight: 21 },
  exercise: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.md,
    minHeight: 78,
    padding: spacingTokens.md,
  },
  exerciseCopy: { flex: 1, gap: spacingTokens.xs, minWidth: 0 },
  exerciseList: { gap: spacingTokens.sm },
  exerciseMeta: { color: colorTokens.mutedText, fontSize: 13, lineHeight: 19 },
  exerciseTitle: { color: colorTokens.text, fontSize: 15, fontWeight: "800", lineHeight: 21 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacingTokens.sm },
  metaItem: {
    backgroundColor: colorTokens.subtle,
    borderRadius: 6,
    gap: spacingTokens.xs,
    minHeight: 68,
    minWidth: 142,
    padding: spacingTokens.sm,
    width: "48%",
  },
  metaLabel: { color: colorTokens.mutedText, fontSize: 12, fontWeight: "700" },
  metaValue: { color: colorTokens.text, fontSize: 14, fontWeight: "800", lineHeight: 20 },
  pressed: { opacity: 0.72 },
  section: {
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
    gap: spacingTokens.md,
    paddingTop: spacingTokens.lg,
  },
  sectionTitle: { color: colorTokens.text, fontSize: 18, fontWeight: "800", lineHeight: 25 },
});
