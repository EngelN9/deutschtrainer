import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { BookOpen, ChevronRight, Clock3 } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  CourseCatalog,
  LessonContent,
  ReadingComprehensionExercise,
} from "@deutschtrainer/shared-types";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { ContentScreen } from "../src/components/ContentScreen";
import { StatePanel } from "../src/components/StatePanel";
import { AuthGate } from "../src/features/auth/AuthGate";
import { useAuthStore } from "../src/features/auth/useAuthStore";
import { getLessonExercises } from "../src/features/courses/courseRepository";
import { useCourseCatalog } from "../src/features/courses/useCourseCatalog";

interface ReadingEntry {
  exercise: ReadingComprehensionExercise;
  lesson: LessonContent;
}

export default function ReadingScreen() {
  const router = useRouter();
  const authMode = useAuthStore((state) => state.authMode);
  const catalogQuery = useCourseCatalog({ enabled: authMode === "supabase" });
  const entries = catalogQuery.data ? collectReadingEntries(catalogQuery.data) : [];

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description="閱讀經人工審核後發布的德文文章，完成四題理解練習。"
        eyebrow="閱讀中心"
        showMainNavigation
        title="從文章建立理解力"
      >
        {authMode === "demo" ? (
          <StatePanel
            message="離線 Demo 目前沒有閱讀文章；登入連線版後才會顯示經人工審核發布的閱讀內容。"
            state="empty"
            title="閱讀中心尚未開放給 Demo"
          />
        ) : catalogQuery.isLoading ? (
          <StatePanel message="正在載入閱讀文章..." state="loading" title="準備閱讀內容" />
        ) : catalogQuery.isError ? (
          <StatePanel
            message={catalogQuery.error.message}
            onRetry={() => void catalogQuery.refetch()}
            state="error"
            title="閱讀內容載入失敗"
          />
        ) : entries.length === 0 ? (
          <StatePanel
            message="目前沒有已完成德語人工審核並發布的閱讀文章。內容審核完成後會顯示在此處。"
            state="empty"
            title="尚無可用閱讀內容"
          />
        ) : (
          <View style={styles.list}>
            {entries.map(({ exercise, lesson }) => (
              <Pressable
                accessibilityLabel={`開啟 ${exercise.level} 閱讀：${exercise.articleTitleDe}`}
                accessibilityRole="button"
                key={exercise.id}
                onPress={() =>
                  router.push({
                    pathname: "/exercise/[lessonId]",
                    params: { exerciseId: exercise.id, lessonId: lesson.id },
                  } as Href)
                }
                style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
              >
                <View style={styles.iconWrap}>
                  <BookOpen color={colorTokens.teal} size={22} />
                </View>
                <View style={styles.copy}>
                  <View style={styles.metaRow}>
                    <Text style={styles.level}>{exercise.level}</Text>
                    <View style={styles.timeRow}>
                      <Clock3 color={colorTokens.mutedText} size={14} />
                      <Text style={styles.timeText}>
                        約 {exercise.estimatedReadingMinutes} 分鐘
                      </Text>
                    </View>
                  </View>
                  <Text selectable style={styles.title}>
                    {exercise.articleTitleDe}
                  </Text>
                  <Text style={styles.lesson}>{lesson.titleZhTw}</Text>
                  <Text style={styles.summary} numberOfLines={3}>
                    {exercise.passageDe}
                  </Text>
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

function collectReadingEntries(catalog: CourseCatalog): ReadingEntry[] {
  return catalog.courses.flatMap((course) =>
    course.units.flatMap((unit) =>
      unit.lessons.flatMap((lesson) =>
        getLessonExercises(lesson)
          .filter(
            (exercise): exercise is ReadingComprehensionExercise =>
              exercise.type === "reading_comprehension",
          )
          .map((exercise) => ({ exercise, lesson })),
      ),
    ),
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.md,
    minHeight: 120,
    padding: spacingTokens.md,
  },
  copy: {
    flex: 1,
    gap: spacingTokens.xs,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: "#E7F6F3",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  lesson: {
    color: colorTokens.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  level: {
    color: colorTokens.teal,
    fontSize: 13,
    fontWeight: "800",
  },
  list: {
    gap: spacingTokens.md,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.md,
    justifyContent: "space-between",
  },
  pressed: {
    opacity: 0.72,
  },
  summary: {
    color: colorTokens.text,
    fontSize: 14,
    lineHeight: 21,
  },
  timeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.xs,
  },
  timeText: {
    color: colorTokens.mutedText,
    fontSize: 13,
  },
  title: {
    color: colorTokens.text,
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 27,
  },
});
