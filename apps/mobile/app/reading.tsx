import { useMemo, useState } from "react";
import type { CefrLevel, ReadingComprehensionExercise } from "@deutschtrainer/shared-types";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { BookOpenText, ChevronRight, Clock3 } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../src/features/auth/AuthGate";
import { useAuthStore } from "../src/features/auth/useAuthStore";
import { getLessonExercises } from "../src/features/courses/courseRepository";
import { useCourseCatalog } from "../src/features/courses/useCourseCatalog";
import { ContentScreen } from "../src/components/ContentScreen";
import { LevelSelector } from "../src/components/LevelSelector";
import { StatePanel } from "../src/components/StatePanel";

interface ReadingCard {
  exercise: ReadingComprehensionExercise;
  lessonId: string;
  lessonTitleZhTw: string;
}

export default function ReadingScreen() {
  const router = useRouter();
  const authMode = useAuthStore((state) => state.authMode);
  const [level, setLevel] = useState<CefrLevel>("B1");
  const catalogQuery = useCourseCatalog();
  const readings = useMemo(() => {
    if (authMode === "demo") {
      return [];
    }
    const cards: ReadingCard[] = [];
    for (const course of catalogQuery.data?.courses ?? []) {
      for (const unit of course.units) {
        for (const lesson of unit.lessons) {
          for (const exercise of getLessonExercises(lesson)) {
            if (exercise.type === "reading_comprehension" && exercise.level === level) {
              cards.push({ exercise, lessonId: lesson.id, lessonTitleZhTw: lesson.titleZhTw });
            }
          }
        }
      }
    }
    return cards;
  }, [authMode, catalogQuery.data, level]);

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description="閱讀原創德文文章，完成四題固定理解題；正式結果由伺服器重新評分。"
        eyebrow="閱讀中心"
        showMainNavigation
        title="從理解到精讀"
      >
        <LevelSelector onChange={setLevel} value={level} />
        {authMode === "demo" ? (
          <StatePanel
            message="離線 Demo 尚未包含經人工審核的閱讀內容；請使用 Connected Web。"
            state="empty"
            title="Demo 未開放閱讀"
          />
        ) : catalogQuery.isLoading ? (
          <StatePanel message="正在載入已發布閱讀內容..." state="loading" title="準備文章" />
        ) : catalogQuery.isError ? (
          <StatePanel
            message={catalogQuery.error.message}
            onRetry={() => void catalogQuery.refetch()}
            state="error"
            title="閱讀內容載入失敗"
          />
        ) : readings.length === 0 ? (
          <StatePanel
            message="這個程度目前沒有通過人工審核並發布的閱讀文章。"
            state="empty"
            title="尚無已發布內容"
          />
        ) : (
          <View style={styles.list}>
            {readings.map(({ exercise, lessonId, lessonTitleZhTw }) => (
              <Pressable
                accessibilityLabel={`開始閱讀 ${exercise.passageTitleDe}`}
                accessibilityRole="button"
                key={exercise.id}
                onPress={() =>
                  router.push({
                    pathname: "/exercise/[lessonId]",
                    params: { lessonId, exerciseId: exercise.id },
                  } as Href)
                }
                style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
              >
                <View style={styles.cardCopy}>
                  <Text style={styles.lesson}>{lessonTitleZhTw}</Text>
                  <Text style={styles.title}>{exercise.passageTitleDe}</Text>
                  <View style={styles.metaRow}>
                    <BookOpenText color={colorTokens.teal} size={17} />
                    <Text style={styles.meta}>4 題</Text>
                    <Clock3 color={colorTokens.mutedText} size={17} />
                    <Text style={styles.meta}>約 {exercise.estimatedReadingMinutes} 分鐘</Text>
                  </View>
                </View>
                <ChevronRight color={colorTokens.mutedText} size={22} />
              </Pressable>
            ))}
          </View>
        )}
      </ContentScreen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.md,
    minHeight: 116,
    padding: spacingTokens.lg,
  },
  cardCopy: { flex: 1, gap: spacingTokens.sm },
  lesson: { color: colorTokens.teal, fontSize: 13, fontWeight: "800" },
  list: { gap: spacingTokens.md },
  meta: { color: colorTokens.mutedText, fontSize: 13 },
  metaRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacingTokens.sm },
  pressed: { opacity: 0.72 },
  title: { color: colorTokens.text, fontSize: 20, fontWeight: "800", lineHeight: 28 },
});
