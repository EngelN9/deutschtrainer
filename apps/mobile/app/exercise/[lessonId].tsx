import { useEffect, useRef, useState } from "react";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2, XCircle } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { gradeFixedExercise, type GradingResult } from "@deutschtrainer/grading";
import { AuthGate } from "../../src/features/auth/AuthGate";
import { useAuthStore } from "../../src/features/auth/useAuthStore";
import { findLesson, getLessonExercises } from "../../src/features/courses/courseRepository";
import { useCourseCatalog } from "../../src/features/courses/useCourseCatalog";
import {
  FixedExerciseInput,
  formatAcceptedAnswer,
  isExerciseAnswered,
} from "../../src/features/exercises/FixedExerciseInput";
import { useProgressStore } from "../../src/features/progress/useProgressStore";
import { ContentScreen } from "../../src/components/ContentScreen";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { ProgressBar } from "../../src/components/ProgressBar";
import { StatePanel } from "../../src/components/StatePanel";

export default function ExerciseScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const catalogQuery = useCourseCatalog();
  const lesson = catalogQuery.data ? findLesson(catalogQuery.data, lessonId) : undefined;
  const exercises = lesson ? getLessonExercises(lesson) : [];
  const progress = useProgressStore((state) =>
    profile ? state.byUserId[profile.id]?.lessons[lessonId] : undefined,
  );
  const hasHydrated = useProgressStore((state) => state.hasHydrated);
  const recordResult = useProgressStore((state) => state.recordResult);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState<unknown>(undefined);
  const [result, setResult] = useState<GradingResult | undefined>();
  const [saving, setSaving] = useState(false);
  const initializedLesson = useRef<string | undefined>(undefined);
  const exercise = exercises[currentIndex];
  const displayPercent = exercises.length
    ? Math.round(((currentIndex + (result ? 1 : 0)) / exercises.length) * 100)
    : 0;

  useEffect(() => {
    if (!hasHydrated || exercises.length === 0 || initializedLesson.current === lessonId) {
      return;
    }

    const firstIncomplete = exercises.findIndex(
      (entry) => !progress?.completedExerciseIds.includes(entry.id),
    );
    setCurrentIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
    initializedLesson.current = lessonId;
  }, [exercises, hasHydrated, lessonId, progress?.completedExerciseIds]);

  async function submitAnswer() {
    if (!exercise || !profile || result || saving || !isExerciseAnswered(exercise, answer)) {
      return;
    }

    const gradingResult = gradeFixedExercise(exercise, answer);
    const submittedAt = new Date().toISOString();
    setSaving(true);
    try {
      await recordResult(
        profile.id,
        {
          exerciseId: exercise.id,
          lessonId,
          score: gradingResult.score,
          isCorrect: gradingResult.isCorrect,
          submittedAt,
        },
        exercises.length,
        currentIndex,
      );
      setResult(gradingResult);
    } finally {
      setSaving(false);
    }
  }

  function continueSession() {
    if (!exercise || !result) {
      return;
    }

    if (currentIndex >= exercises.length - 1) {
      router.replace({
        pathname: "/lesson-result/[lessonId]",
        params: { lessonId },
      } as Href);
      return;
    }

    setCurrentIndex((index) => index + 1);
    setAnswer(undefined);
    setResult(undefined);
  }

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description={exercise ? exerciseTypeLabel(exercise.type) : undefined}
        eyebrow={
          lesson ? `${lesson.level} · ${currentIndex + 1} / ${exercises.length}` : "課堂練習"
        }
        onBack={() =>
          router.replace({ pathname: "/lesson/[lessonId]", params: { lessonId } } as Href)
        }
        showBack
        title={exercise?.title ?? lesson?.titleZhTw ?? "課堂練習"}
      >
        {catalogQuery.isLoading || !hasHydrated ? (
          <StatePanel message="正在恢復課堂進度..." state="loading" title="準備題目" />
        ) : catalogQuery.isError ? (
          <StatePanel
            message={catalogQuery.error.message}
            onRetry={() => void catalogQuery.refetch()}
            state="error"
            title="題目載入失敗"
          />
        ) : !lesson || !exercise ? (
          <StatePanel message="這堂課目前沒有可作答的固定題型。" state="empty" title="尚無題目" />
        ) : (
          <>
            <ProgressBar accessibilityLabel="本次課堂作答進度" percent={displayPercent} />
            <View style={styles.promptSection}>
              <Text style={styles.instruction}>{exercise.instructionZhTw}</Text>
              <Text selectable style={styles.prompt}>
                {exercise.promptDe}
              </Text>
            </View>
            <FixedExerciseInput
              disabled={Boolean(result)}
              exercise={exercise}
              onChange={setAnswer}
              value={answer}
            />
            {result ? (
              <View style={[styles.feedback, result.isCorrect ? styles.correct : styles.incorrect]}>
                <View style={styles.feedbackHeading}>
                  {result.isCorrect ? (
                    <CheckCircle2 color={colorTokens.success} size={24} />
                  ) : (
                    <XCircle color={colorTokens.danger} size={24} />
                  )}
                  <Text style={styles.feedbackTitle}>
                    {result.isCorrect
                      ? "答對了"
                      : result.score > 0
                        ? `部分正確 · ${result.score} 分`
                        : "再看一次"}
                  </Text>
                </View>
                {!result.isCorrect ? (
                  <>
                    <Text style={styles.feedbackLabel}>參考答案</Text>
                    <Text selectable style={styles.acceptedAnswer}>
                      {formatAcceptedAnswer(exercise)}
                    </Text>
                  </>
                ) : null}
                {exercise.type === "error_correction" ? (
                  <Text style={styles.explanation}>{exercise.explanationZhTw}</Text>
                ) : null}
              </View>
            ) : null}
            <PrimaryButton
              accessibilityLabel={result ? "前往下一題或結果" : "提交答案"}
              disabled={!result && !isExerciseAnswered(exercise, answer)}
              loading={saving}
              onPress={result ? continueSession : () => void submitAnswer()}
            >
              {result
                ? currentIndex >= exercises.length - 1
                  ? "查看課堂結果"
                  : "下一題"
                : "提交答案"}
            </PrimaryButton>
          </>
        )}
      </ContentScreen>
    </AuthGate>
  );
}

function exerciseTypeLabel(type: string) {
  const labels: Record<string, string> = {
    multiple_choice: "單選題",
    multiple_select: "複選題 · 可部分得分",
    fill_blank: "填空題",
    sentence_order: "句子排序",
    matching: "配對題 · 可部分得分",
    error_correction: "錯誤修正",
  };
  return labels[type] ?? "固定題型";
}

const styles = StyleSheet.create({
  acceptedAnswer: {
    color: colorTokens.text,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
  },
  correct: {
    backgroundColor: "#ECFDF3",
    borderColor: "#86C99A",
  },
  explanation: {
    color: colorTokens.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  feedback: {
    borderRadius: 8,
    borderWidth: 1,
    gap: spacingTokens.sm,
    padding: spacingTokens.md,
  },
  feedbackHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.sm,
  },
  feedbackLabel: {
    color: colorTokens.mutedText,
    fontSize: 13,
    fontWeight: "700",
  },
  feedbackTitle: {
    color: colorTokens.text,
    fontSize: 17,
    fontWeight: "800",
  },
  incorrect: {
    backgroundColor: "#FEF2F2",
    borderColor: "#E6A1A1",
  },
  instruction: {
    color: colorTokens.mutedText,
    fontSize: 15,
    lineHeight: 22,
  },
  prompt: {
    color: colorTokens.text,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 32,
  },
  promptSection: {
    borderBottomColor: colorTokens.border,
    borderBottomWidth: 1,
    gap: spacingTokens.md,
    paddingBottom: spacingTokens.lg,
  },
});
