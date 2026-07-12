import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2, RotateCcw, Trophy } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../../src/features/auth/AuthGate";
import { useAuthStore } from "../../src/features/auth/useAuthStore";
import { findLesson, getLessonExercises } from "../../src/features/courses/courseRepository";
import { useCourseCatalog } from "../../src/features/courses/useCourseCatalog";
import { useProgressStore } from "../../src/features/progress/useProgressStore";
import { ContentScreen } from "../../src/components/ContentScreen";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { ProgressBar } from "../../src/components/ProgressBar";
import { StatePanel } from "../../src/components/StatePanel";

export default function LessonResultScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const catalogQuery = useCourseCatalog();
  const lesson = catalogQuery.data ? findLesson(catalogQuery.data, lessonId) : undefined;
  const exercises = lesson ? getLessonExercises(lesson) : [];
  const userProgress = useProgressStore((state) =>
    profile ? state.byUserId[profile.id] : undefined,
  );
  const resetLesson = useProgressStore((state) => state.resetLesson);
  const results = exercises
    .map((exercise) => userProgress?.exerciseResults[exercise.id])
    .filter((result) => result !== undefined);
  const averageScore = exercises.length
    ? Math.round(results.reduce((total, result) => total + result.score, 0) / exercises.length)
    : 0;
  const correctCount = results.filter((result) => result.isCorrect).length;

  async function practiceAgain() {
    if (!profile) {
      return;
    }

    await resetLesson(profile.id, lessonId);
    router.replace({ pathname: "/exercise/[lessonId]", params: { lessonId } } as Href);
  }

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description={lesson ? `${lesson.level} · ${lesson.titleZhTw}` : undefined}
        eyebrow="課堂結果"
        onBack={() => router.replace("/courses")}
        showBack
        title="這堂課完成了"
      >
        {catalogQuery.isLoading ? (
          <StatePanel message="正在計算課堂結果..." state="loading" title="整理結果" />
        ) : !lesson ? (
          <StatePanel message="找不到這堂課的結果。" state="empty" title="結果不存在" />
        ) : (
          <>
            <View style={styles.scoreBand}>
              <View style={styles.trophy}>
                <Trophy color="#FFFFFF" size={27} />
              </View>
              <Text style={styles.score}>{averageScore}</Text>
              <Text style={styles.scoreUnit}>分</Text>
              <Text style={styles.scoreSummary}>
                {correctCount} / {exercises.length} 題完全正確
              </Text>
            </View>
            <ProgressBar
              accessibilityLabel="課堂得分"
              percent={averageScore}
              tone={averageScore >= 80 ? "success" : "primary"}
            />
            <View style={styles.resultList}>
              {exercises.map((exercise, index) => {
                const result = userProgress?.exerciseResults[exercise.id];
                return (
                  <View key={exercise.id} style={styles.resultRow}>
                    <View style={styles.resultIndex}>
                      <Text style={styles.resultIndexText}>{index + 1}</Text>
                    </View>
                    <View style={styles.resultCopy}>
                      <Text style={styles.resultTitle}>{exercise.title}</Text>
                      <Text style={styles.resultScore}>
                        {result ? `${result.score} 分` : "未作答"}
                      </Text>
                    </View>
                    {result?.isCorrect ? (
                      <CheckCircle2 color={colorTokens.success} size={22} />
                    ) : (
                      <RotateCcw color={colorTokens.accent} size={21} />
                    )}
                  </View>
                );
              })}
            </View>
            <View style={styles.note}>
              <Text style={styles.noteTitle}>下一步</Text>
              <Text style={styles.noteText}>
                {averageScore >= 80
                  ? "這堂課的固定題型表現穩定，可以回到單元繼續下一課。"
                  : "建議再練習一次；錯誤診斷與間隔複習會在後續階段加入。"}
              </Text>
            </View>
            <PrimaryButton
              accessibilityLabel="回到課堂內容"
              onPress={() =>
                router.replace({
                  pathname: "/lesson/[lessonId]",
                  params: { lessonId },
                } as Href)
              }
            >
              回到課堂
            </PrimaryButton>
            <PrimaryButton
              accessibilityLabel="清除本課進度並重新練習"
              onPress={() => void practiceAgain()}
              variant="secondary"
            >
              重新練習
            </PrimaryButton>
          </>
        )}
      </ContentScreen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  note: {
    backgroundColor: "#FFF8E7",
    borderColor: "#E4C77A",
    borderRadius: 8,
    borderWidth: 1,
    gap: spacingTokens.sm,
    padding: spacingTokens.md,
  },
  noteText: {
    color: colorTokens.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  noteTitle: {
    color: colorTokens.text,
    fontSize: 16,
    fontWeight: "800",
  },
  resultCopy: {
    flex: 1,
    gap: spacingTokens.xs,
  },
  resultIndex: {
    alignItems: "center",
    backgroundColor: colorTokens.subtle,
    borderRadius: 6,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  resultIndexText: {
    color: colorTokens.text,
    fontSize: 13,
    fontWeight: "800",
  },
  resultList: {
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
  },
  resultRow: {
    alignItems: "center",
    borderBottomColor: colorTokens.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.md,
    minHeight: 72,
    paddingVertical: spacingTokens.md,
  },
  resultScore: {
    color: colorTokens.mutedText,
    fontSize: 13,
  },
  resultTitle: {
    color: colorTokens.text,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
  score: {
    color: colorTokens.text,
    fontSize: 48,
    fontWeight: "900",
    lineHeight: 54,
  },
  scoreBand: {
    alignItems: "baseline",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.sm,
  },
  scoreSummary: {
    color: colorTokens.mutedText,
    flexBasis: "100%",
    fontSize: 15,
    lineHeight: 22,
  },
  scoreUnit: {
    color: colorTokens.mutedText,
    fontSize: 18,
    fontWeight: "700",
  },
  trophy: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colorTokens.accent,
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    marginRight: spacingTokens.sm,
    width: 48,
  },
});
