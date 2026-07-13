import { useEffect, useRef, useState } from "react";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Lightbulb, XCircle } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
import {
  learningRecordsQueryKey,
  useLearningRecords,
} from "../../src/features/learning-records/useLearningRecords";
import { submitRemoteAttempt } from "../../src/features/learning-records/learningRecordsRepository";
import { mobileEnv } from "../../src/lib/env";
import { toUserFacingError } from "../../src/lib/userFacingErrors";
import { ContentScreen } from "../../src/components/ContentScreen";
import { MessageBanner } from "../../src/components/MessageBanner";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { ProgressBar } from "../../src/components/ProgressBar";
import { StatePanel } from "../../src/components/StatePanel";

export default function ExerciseScreen() {
  const { exerciseId, lessonId, reviewId } = useLocalSearchParams<{
    exerciseId?: string;
    lessonId: string;
    reviewId?: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  const catalogQuery = useCourseCatalog();
  const learningRecordsQuery = useLearningRecords();
  const lesson = catalogQuery.data ? findLesson(catalogQuery.data, lessonId) : undefined;
  const lessonExercises = lesson ? getLessonExercises(lesson) : [];
  const reviewExercise = exerciseId
    ? lessonExercises.find((entry) => entry.id === exerciseId)
    : undefined;
  const isReviewSession = Boolean(reviewId && reviewExercise);
  const exercises = isReviewSession && reviewExercise ? [reviewExercise] : lessonExercises;
  const progress = useProgressStore((state) =>
    profile ? state.byUserId[profile.id]?.lessons[lessonId] : undefined,
  );
  const hasHydrated = useProgressStore((state) => state.hasHydrated);
  const recordAttempt = useProgressStore((state) => state.recordAttempt);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState<unknown>(undefined);
  const [result, setResult] = useState<GradingResult | undefined>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [usedHint, setUsedHint] = useState(false);
  const initializedLesson = useRef<string | undefined>(undefined);
  const attemptStartedAt = useRef(Date.now());
  const idempotencyKey = useRef<string | undefined>(undefined);
  const exercise = exercises[currentIndex];
  const syncedLessonProgress = learningRecordsQuery.data?.lessonProgress.find(
    (entry) => entry.lessonId === lessonId,
  );
  const completedExerciseIds =
    syncedLessonProgress?.completedExerciseIds ?? progress?.completedExerciseIds ?? [];
  const displayPercent = exercises.length
    ? Math.round(((currentIndex + (result ? 1 : 0)) / exercises.length) * 100)
    : 0;

  useEffect(() => {
    const sessionId = `${lessonId}:${reviewId ?? "lesson"}:${exerciseId ?? "all"}`;
    if (
      !hasHydrated ||
      learningRecordsQuery.isLoading ||
      exercises.length === 0 ||
      initializedLesson.current === sessionId
    ) {
      return;
    }

    if (isReviewSession) {
      setCurrentIndex(0);
    } else {
      const firstIncomplete = exercises.findIndex(
        (entry) => !completedExerciseIds.includes(entry.id),
      );
      setCurrentIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
    }
    attemptStartedAt.current = Date.now();
    initializedLesson.current = sessionId;
  }, [
    completedExerciseIds,
    exerciseId,
    exercises,
    hasHydrated,
    isReviewSession,
    learningRecordsQuery.isLoading,
    lessonId,
    reviewId,
  ]);

  async function submitAnswer() {
    if (!exercise || !profile || result || saving || !isExerciseAnswered(exercise, answer)) {
      return;
    }

    const gradingResult = gradeFixedExercise(exercise, answer);
    const submittedAt = new Date().toISOString();
    const durationMs = Math.max(0, Date.now() - attemptStartedAt.current);
    idempotencyKey.current ??= `${profile.id}:${exercise.id}:${submittedAt}`;
    setSaving(true);
    setSaveError(undefined);
    try {
      if (mobileEnv.contentSource === "supabase") {
        await submitRemoteAttempt({
          exerciseId: exercise.id,
          answer,
          gradingResult,
          durationMs,
          usedHint,
          mode: isReviewSession ? "review" : "lesson",
          idempotencyKey: idempotencyKey.current,
          ...(reviewId ? { reviewId } : {}),
        });
      }
      await recordAttempt({
        userId: profile.id,
        lessonId,
        exercise,
        answer,
        gradingResult,
        submittedAt,
        durationMs,
        usedHint,
        mode: isReviewSession ? "review" : "lesson",
        idempotencyKey: idempotencyKey.current,
        totalExercises: lessonExercises.length,
        exerciseIndex: isReviewSession
          ? lessonExercises.findIndex((entry) => entry.id === exercise.id)
          : currentIndex,
        ...(reviewId ? { reviewId } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: learningRecordsQueryKey(profile.id) });
      setResult(gradingResult);
    } catch (error) {
      setSaveError(toUserFacingError(error));
    } finally {
      setSaving(false);
    }
  }

  function continueSession() {
    if (!exercise || !result) {
      return;
    }

    if (isReviewSession) {
      router.back();
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
    setUsedHint(false);
    setSaveError(undefined);
    attemptStartedAt.current = Date.now();
    idempotencyKey.current = undefined;
  }

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description={exercise ? exerciseTypeLabel(exercise.type) : undefined}
        eyebrow={
          lesson
            ? `${lesson.level} · ${isReviewSession ? "到期複習" : `${currentIndex + 1} / ${exercises.length}`}`
            : "課堂練習"
        }
        onBack={() => router.back()}
        showBack
        title={exercise?.title ?? lesson?.titleZhTw ?? "課堂練習"}
      >
        {catalogQuery.isLoading || learningRecordsQuery.isLoading || !hasHydrated ? (
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
            <MessageBanner message={saveError ?? null} tone="error" />
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
            {!result ? (
              <View style={styles.hintSection}>
                <Pressable
                  accessibilityLabel="顯示作答提示"
                  accessibilityRole="button"
                  onPress={() => setUsedHint(true)}
                  style={({ pressed }) => [styles.hintButton, pressed ? styles.pressed : null]}
                >
                  <Lightbulb color={colorTokens.teal} size={18} />
                  <Text style={styles.hintButtonText}>{usedHint ? "提示已顯示" : "查看提示"}</Text>
                </Pressable>
                {usedHint ? (
                  <Text style={styles.hintText}>{exerciseHint(exercise.type)}</Text>
                ) : null}
              </View>
            ) : null}
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
                ? isReviewSession
                  ? "完成本次複習"
                  : currentIndex >= exercises.length - 1
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

function exerciseHint(type: string) {
  const hints: Record<string, string> = {
    multiple_choice: "先辨認句子的核心語意，再排除語法位置不合的選項。",
    multiple_select: "逐一檢查每個選項；正確答案可能不只一個。",
    fill_blank: "先找出空格需要的詞性，再檢查格位、詞尾與動詞位置。",
    sentence_order: "德語主句通常讓限定動詞位於第二位置，從句則靠近句尾。",
    matching: "先完成最有把握的配對，再用剩餘項目交叉檢查。",
    error_correction: "先定位動詞、連接詞與名詞格位，再重寫完整句子。",
  };
  return hints[type] ?? "先辨認題目測量的技能，再逐步檢查答案。";
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
  hintButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colorTokens.border,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.sm,
    minHeight: 40,
    paddingHorizontal: spacingTokens.md,
  },
  hintButtonText: {
    color: colorTokens.teal,
    fontSize: 14,
    fontWeight: "800",
  },
  hintSection: {
    gap: spacingTokens.sm,
  },
  hintText: {
    color: colorTokens.mutedText,
    fontSize: 14,
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
  pressed: {
    opacity: 0.7,
  },
});
