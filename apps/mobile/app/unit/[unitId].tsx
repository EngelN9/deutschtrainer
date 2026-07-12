import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2, ChevronRight, Clock3 } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../../src/features/auth/AuthGate";
import { useAuthStore } from "../../src/features/auth/useAuthStore";
import { findUnit, getLessonExercises } from "../../src/features/courses/courseRepository";
import { useCourseCatalog } from "../../src/features/courses/useCourseCatalog";
import { getLessonCompletionPercent } from "../../src/features/progress/progressModel";
import { useProgressStore } from "../../src/features/progress/useProgressStore";
import { ContentScreen } from "../../src/components/ContentScreen";
import { ProgressBar } from "../../src/components/ProgressBar";
import { StatePanel } from "../../src/components/StatePanel";

export default function UnitScreen() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const catalogQuery = useCourseCatalog();
  const userProgress = useProgressStore((state) =>
    profile ? state.byUserId[profile.id] : undefined,
  );
  const unit = catalogQuery.data ? findUnit(catalogQuery.data, unitId) : undefined;
  const course = catalogQuery.data?.courses.find((entry) =>
    entry.units.some((courseUnit) => courseUnit.id === unitId),
  );

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description={course ? `${course.titleZhTw} · ${unit?.lessons.length ?? 0} 堂課` : undefined}
        eyebrow={course?.level}
        showBack
        title={unit?.titleZhTw ?? "單元內容"}
      >
        {catalogQuery.isLoading ? (
          <StatePanel message="正在載入課堂..." state="loading" title="載入單元" />
        ) : catalogQuery.isError ? (
          <StatePanel
            message={catalogQuery.error.message}
            onRetry={() => void catalogQuery.refetch()}
            state="error"
            title="單元載入失敗"
          />
        ) : !unit ? (
          <StatePanel message="找不到這個單元，內容可能已更新。" state="empty" title="單元不存在" />
        ) : (
          <View style={styles.lessonList}>
            {unit.lessons.map((lesson, index) => {
              const exercises = getLessonExercises(lesson);
              const progress = userProgress?.lessons[lesson.id];
              const percent = getLessonCompletionPercent(progress, exercises.length);
              const completed = Boolean(progress?.completedAt);

              return (
                <Pressable
                  accessibilityLabel={`開啟第 ${index + 1} 課 ${lesson.titleZhTw}`}
                  accessibilityRole="button"
                  key={lesson.id}
                  onPress={() =>
                    router.push({
                      pathname: "/lesson/[lessonId]",
                      params: { lessonId: lesson.id },
                    } as Href)
                  }
                  style={({ pressed }) => [styles.lessonRow, pressed ? styles.pressed : null]}
                >
                  <View style={[styles.index, completed ? styles.completedIndex : null]}>
                    {completed ? (
                      <CheckCircle2 color="#FFFFFF" size={20} />
                    ) : (
                      <Text style={styles.indexText}>{index + 1}</Text>
                    )}
                  </View>
                  <View style={styles.lessonCopy}>
                    <Text style={styles.lessonTitle}>{lesson.titleZhTw}</Text>
                    <View style={styles.metaRow}>
                      <Clock3 color={colorTokens.mutedText} size={15} />
                      <Text style={styles.meta}>
                        {lesson.estimatedMinutes} 分鐘 · {exercises.length} 題 · {percent}%
                      </Text>
                    </View>
                    <ProgressBar
                      accessibilityLabel={`${lesson.titleZhTw} 進度`}
                      percent={percent}
                      tone={completed ? "success" : "primary"}
                    />
                  </View>
                  <ChevronRight color={colorTokens.mutedText} size={20} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ContentScreen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  completedIndex: {
    backgroundColor: colorTokens.success,
    borderColor: colorTokens.success,
  },
  index: {
    alignItems: "center",
    backgroundColor: colorTokens.subtle,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  indexText: {
    color: colorTokens.text,
    fontSize: 15,
    fontWeight: "800",
  },
  lessonCopy: {
    flex: 1,
    gap: spacingTokens.sm,
  },
  lessonList: {
    gap: spacingTokens.sm,
  },
  lessonRow: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.md,
    minHeight: 106,
    padding: spacingTokens.md,
  },
  lessonTitle: {
    color: colorTokens.text,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 24,
  },
  meta: {
    color: colorTokens.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.xs,
  },
  pressed: {
    opacity: 0.72,
  },
});
