import { useEffect, useRef, useState } from "react";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Lightbulb, XCircle } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LessonExercise } from "@deutschtrainer/shared-types";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { gradeFixedExercise, type GradingResult } from "@deutschtrainer/grading";
import type { EvaluateResponseResponse } from "@deutschtrainer/validation";
import { AuthGate } from "../../src/features/auth/AuthGate";
import { useAuthStore } from "../../src/features/auth/useAuthStore";
import {
  findLesson,
  getLessonExercises,
  isAiEvaluatedExercise,
  isFixedExercise,
} from "../../src/features/courses/courseRepository";
import { useCourseCatalog } from "../../src/features/courses/useCourseCatalog";
import { AiExerciseInput } from "../../src/features/ai-evaluation/AiExerciseInput";
import { AiFeedbackPanel } from "../../src/features/ai-evaluation/AiFeedbackPanel";
import { submitAiEvaluation } from "../../src/features/ai-evaluation/aiEvaluationRepository";
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
import {
  completeRemoteReview,
  submitRemoteAttempt,
} from "../../src/features/learning-records/learningRecordsRepository";
import { useConnectivityStore } from "../../src/features/offline/connectivityStore";
import { useOfflineStore } from "../../src/features/offline/useOfflineStore";
import { isNetworkApiError } from "../../src/lib/apiClient";
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
  const connectivity = useConnectivityStore((state) => state.status);
  const enqueueOfflineAttempt = useOfflineStore((state) => state.enqueueAttempt);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState<unknown>(undefined);
  const [result, setResult] = useState<GradingResult | undefined>();
  const [aiEvaluation, setAiEvaluation] = useState<EvaluateResponseResponse | undefined>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [saveNotice, setSaveNotice] = useState<string>();
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
  const isFallback = aiEvaluation?.status === "fallback";
  const displayPercent = exercises.length
    ? Math.round(((currentIndex + (result && !isFallback ? 1 : 0)) / exercises.length) * 100)
    : 0;
  const offlineUnavailableMessage =
    connectivity === "offline" && exercise
      ? isReviewSession
        ? "到期複習需要連線，恢復網路後即可提交。"
        : isAiEvaluatedExercise(exercise)
          ? "AI 批改需要連線；固定題仍可離線作答。"
          : undefined
      : undefined;

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
    if (
      !exercise ||
      !profile ||
      (result && !isFallback) ||
      saving ||
      !isCurrentExerciseAnswered(exercise, answer)
    ) {
      return;
    }

    const submittedAt = new Date().toISOString();
    const durationMs = Math.max(0, Date.now() - attemptStartedAt.current);
    idempotencyKey.current ??= `${profile.id}:${exercise.id}:${submittedAt}`;
    setSaving(true);
    setSaveError(undefined);
    setSaveNotice(undefined);
    try {
      let gradingResult: GradingResult;

      if (isAiEvaluatedExercise(exercise)) {
        const responseDe = typeof answer === "string" ? answer.trim() : "";
        const evaluation = await submitAiEvaluation({
          exerciseId: exercise.id,
          responseDe,
          durationMs,
          usedHint,
          mode: isReviewSession ? "review" : "lesson",
          idempotencyKey: idempotencyKey.current,
          ...(reviewId ? { reviewId } : {}),
        });
        gradingResult = {
          score: evaluation.feedback.score,
          isCorrect: evaluation.feedback.isCorrect,
          normalizedAnswer: responseDe,
          acceptedAnswer: evaluation.feedback.correctedText,
          details: {
            aiEvaluated: true,
            cached: evaluation.cached,
            fallback: evaluation.status === "fallback",
          },
        };
        setAiEvaluation(evaluation);

        if (evaluation.status === "fallback") {
          setResult(gradingResult);
          return;
        }
      } else if (isFixedExercise(exercise)) {
        gradingResult = gradeFixedExercise(exercise, answer);
        if (mobileEnv.contentSource === "api") {
          if (isReviewSession && reviewId) {
            const remoteResult = (
              await completeRemoteReview(reviewId, {
                answer,
                durationMs,
                usedHint,
                idempotencyKey: idempotencyKey.current,
              })
            ).attempt;
            gradingResult = remoteResult.gradingResult;
          } else {
            const request = {
              exerciseId: exercise.id,
              exerciseVersion: exercise.version,
              answer,
              durationMs,
              usedHint,
              mode: "lesson" as const,
              idempotencyKey: idempotencyKey.current,
              submittedAt,
            };
            let queued = connectivity === "offline";
            if (!queued) {
              try {
                const remoteResult = await submitRemoteAttempt(request);
                gradingResult = remoteResult.gradingResult;
              } catch (error) {
                if (!isNetworkApiError(error)) {
                  throw error;
                }
                queued = true;
              }
            }
            if (queued) {
              await enqueueOfflineAttempt({
                profileId: profile.id,
                lessonId,
                lessonTitle: lesson?.titleZhTw ?? "離線課堂",
                exerciseTitle: exercise.title,
                exerciseVersion: exercise.version,
                queuedAt: new Date().toISOString(),
                request,
                localGradingResult: gradingResult,
              });
              setSaveNotice("作答已保存在裝置，恢復網路後會自動同步。");
            }
          }
        }
      } else {
        throw new Error("這個題型尚未開放作答。");
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
    if (!exercise || !result || isFallback) {
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
    setAiEvaluation(undefined);
    setUsedHint(false);
    setSaveError(undefined);
    setSaveNotice(undefined);
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
          <StatePanel message="這堂課目前沒有可作答的題目。" state="empty" title="尚無題目" />
        ) : (
          <>
            <ProgressBar accessibilityLabel="本次課堂作答進度" percent={displayPercent} />
            <MessageBanner message={saveError ?? null} tone="error" />
            <MessageBanner message={saveNotice ?? offlineUnavailableMessage ?? null} tone="info" />
            <View style={styles.promptSection}>
              <Text style={styles.instruction}>{exercise.instructionZhTw}</Text>
              {isAiEvaluatedExercise(exercise) && exercise.promptZhTw ? (
                <>
                  <Text selectable style={styles.promptZhTw}>
                    {exercise.promptZhTw}
                  </Text>
                  <Text selectable style={styles.secondaryPrompt}>
                    {exercise.promptDe}
                  </Text>
                </>
              ) : (
                <Text selectable style={styles.prompt}>
                  {exercise.promptDe}
                </Text>
              )}
            </View>
            {isFixedExercise(exercise) ? (
              <FixedExerciseInput
                disabled={Boolean(result)}
                exercise={exercise}
                onChange={setAnswer}
                value={answer}
              />
            ) : isAiEvaluatedExercise(exercise) ? (
              <AiExerciseInput
                disabled={(Boolean(result) && !isFallback) || connectivity === "offline"}
                exercise={exercise}
                onChange={setAnswer}
                value={typeof answer === "string" ? answer : ""}
              />
            ) : null}
            {!result || isFallback ? (
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
            {aiEvaluation ? (
              <AiFeedbackPanel
                cached={aiEvaluation.cached}
                fallback={aiEvaluation.status === "fallback"}
                feedback={aiEvaluation.feedback}
              />
            ) : result && isFixedExercise(exercise) ? (
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
              accessibilityLabel={
                isFallback ? "重新提交 AI 批改" : result ? "前往下一題或結果" : "提交答案"
              }
              disabled={
                (!result && !isCurrentExerciseAnswered(exercise, answer)) ||
                Boolean(offlineUnavailableMessage)
              }
              loading={saving}
              onPress={result && !isFallback ? continueSession : () => void submitAnswer()}
            >
              {isFallback
                ? "重新批改"
                : result
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
    translation: "AI 翻譯批改",
    free_response: "AI 自由回答",
  };
  return labels[type] ?? "課堂題型";
}

function exerciseHint(type: string) {
  const hints: Record<string, string> = {
    multiple_choice: "先辨認句子的核心語意，再排除語法位置不合的選項。",
    multiple_select: "逐一檢查每個選項；正確答案可能不只一個。",
    fill_blank: "先找出空格需要的詞性，再檢查格位、詞尾與動詞位置。",
    sentence_order: "德語主句通常讓限定動詞位於第二位置，從句則靠近句尾。",
    matching: "先完成最有把握的配對，再用剩餘項目交叉檢查。",
    error_correction: "先定位動詞、連接詞與名詞格位，再重寫完整句子。",
    translation: "先保留原句語意，再檢查德語語序、格位與自然搭配。",
    free_response: "先完整回應任務，再加入理由、連接詞與必要細節。",
  };
  return hints[type] ?? "先辨認題目測量的技能，再逐步檢查答案。";
}

function isCurrentExerciseAnswered(exercise: LessonExercise, answer: unknown): boolean {
  if (isFixedExercise(exercise)) {
    return isExerciseAnswered(exercise, answer);
  }
  if (isAiEvaluatedExercise(exercise) && typeof answer === "string") {
    const length = Array.from(answer.trim()).length;
    return length >= exercise.minimumCharacters && length <= exercise.maximumCharacters;
  }
  return false;
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
  promptZhTw: {
    color: colorTokens.text,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 30,
  },
  promptSection: {
    borderBottomColor: colorTokens.border,
    borderBottomWidth: 1,
    gap: spacingTokens.md,
    paddingBottom: spacingTokens.lg,
  },
  secondaryPrompt: {
    color: colorTokens.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.7,
  },
});
