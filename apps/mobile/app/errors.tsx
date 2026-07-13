import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { AlertCircle } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import type { LessonExercise } from "@deutschtrainer/shared-types";
import { AuthGate } from "../src/features/auth/AuthGate";
import { findExerciseContext } from "../src/features/courses/courseRepository";
import { useCourseCatalog } from "../src/features/courses/useCourseCatalog";
import { useLearningRecords } from "../src/features/learning-records/useLearningRecords";
import { ContentScreen } from "../src/components/ContentScreen";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { StatePanel } from "../src/components/StatePanel";

export default function ErrorsScreen() {
  const router = useRouter();
  const recordsQuery = useLearningRecords();
  const catalogQuery = useCourseCatalog();
  const errors = recordsQuery.data?.errors ?? [];
  const displayedErrors = errors.filter(
    (record, index, records) =>
      records.findIndex((candidate) => candidate.attemptId === record.attemptId) === index,
  );
  const isLoading = recordsQuery.isLoading || catalogQuery.isLoading;
  const error = recordsQuery.error ?? catalogQuery.error;

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description="保留每次錯誤的上下文，讓修正不只停在看答案。"
        eyebrow="錯誤診斷"
        onBack={() => router.back()}
        showBack
        title="錯題紀錄"
      >
        {isLoading ? (
          <StatePanel message="正在整理錯題..." state="loading" title="同步紀錄" />
        ) : error ? (
          <StatePanel
            message={error.message}
            onRetry={() => {
              void recordsQuery.refetch();
              void catalogQuery.refetch();
            }}
            state="error"
            title="無法載入錯題"
          />
        ) : errors.length === 0 ? (
          <StatePanel message="答錯或部分正確的題目會顯示在這裡。" state="empty" title="尚無錯題" />
        ) : (
          <View style={styles.errorList}>
            {displayedErrors.map((record) => {
              const context = catalogQuery.data
                ? findExerciseContext(catalogQuery.data, record.exerciseId)
                : undefined;
              const relatedSkills = errors
                .filter((candidate) => candidate.attemptId === record.attemptId)
                .map((candidate) => recordsQuery.data?.skillNames[candidate.skillId] ?? "相關技能");
              return (
                <View key={record.id} style={styles.errorItem}>
                  <View style={styles.errorHeading}>
                    <AlertCircle color={severityColor(record.severity)} size={22} />
                    <View style={styles.headingCopy}>
                      <Text style={styles.errorTitle}>{context?.exercise.title ?? "課程錯題"}</Text>
                      <Text style={styles.errorMeta}>
                        {severityLabel(record.severity)} · {formatDate(record.createdAt)}
                      </Text>
                      <Text style={styles.errorSkills}>影響技能：{relatedSkills.join("、")}</Text>
                    </View>
                  </View>
                  <View style={styles.answerBlock}>
                    <Text style={styles.answerLabel}>你的答案</Text>
                    <Text selectable style={styles.originalAnswer}>
                      {formatStoredValue(record.original, context?.exercise)}
                    </Text>
                  </View>
                  <View style={styles.answerBlock}>
                    <Text style={styles.answerLabel}>參考答案</Text>
                    <Text selectable style={styles.correctAnswer}>
                      {formatStoredValue(record.correction, context?.exercise)}
                    </Text>
                  </View>
                  <Text style={styles.explanation}>{record.explanationZhTw}</Text>
                  {context ? (
                    <PrimaryButton
                      accessibilityLabel={`重新練習 ${context.exercise.title}`}
                      onPress={() =>
                        router.push({
                          pathname: "/exercise/[lessonId]",
                          params: { lessonId: context.lesson.id },
                        } as Href)
                      }
                      variant="secondary"
                    >
                      重新練習本課
                    </PrimaryButton>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
        <PrimaryButton
          accessibilityLabel="返回今日複習"
          onPress={() => router.replace("/reviews" as Href)}
          variant="secondary"
        >
          返回今日複習
        </PrimaryButton>
      </ContentScreen>
    </AuthGate>
  );
}

function formatStoredValue(value: string, exercise?: LessonExercise): string {
  try {
    const parsed = JSON.parse(value) as unknown;
    return formatAnswerValue(parsed, exercise);
  } catch {
    return value;
  }
}

function formatAnswerValue(value: unknown, exercise?: LessonExercise): string {
  if (typeof value === "string") {
    return resolveExerciseId(value, exercise) ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => formatAnswerValue(entry, exercise)).join("、");
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    for (const key of ["optionId", "optionIds", "acceptedAnswers", "segmentIds"] as const) {
      if (key in record) {
        return formatAnswerValue(record[key], exercise);
      }
    }
    if ("pairs" in record) {
      return formatAnswerValue(record.pairs, exercise);
    }
    return Object.entries(record)
      .map(
        ([left, right]) =>
          `${resolveExerciseId(left, exercise) ?? left}：${formatAnswerValue(right, exercise)}`,
      )
      .join("；");
  }
  return String(value);
}

function resolveExerciseId(value: string, exercise?: LessonExercise): string | undefined {
  if (!exercise) {
    return undefined;
  }
  if (exercise.type === "multiple_choice" || exercise.type === "multiple_select") {
    const option = exercise.options.find(({ id }) => id === value);
    return option
      ? `${option.textDe}${option.textZhTw ? `（${option.textZhTw}）` : ""}`
      : undefined;
  }
  if (exercise.type === "sentence_order") {
    return exercise.segments.find(({ id }) => id === value)?.textDe;
  }
  if (exercise.type === "matching") {
    return [...exercise.leftItems, ...exercise.rightItems].find(({ id }) => id === value)?.textDe;
  }
  return undefined;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function severityLabel(severity: string): string {
  return (
    { minor: "輕微", moderate: "中度", major: "主要錯誤", critical: "關鍵錯誤" }[severity] ?? "錯誤"
  );
}

function severityColor(severity: string): string {
  return severity === "minor" ? colorTokens.warning : colorTokens.danger;
}

const styles = StyleSheet.create({
  answerBlock: {
    gap: spacingTokens.xs,
  },
  answerLabel: {
    color: colorTokens.mutedText,
    fontSize: 12,
    fontWeight: "800",
  },
  correctAnswer: {
    color: colorTokens.success,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  errorHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacingTokens.sm,
  },
  errorItem: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacingTokens.md,
    padding: spacingTokens.md,
  },
  errorList: {
    gap: spacingTokens.md,
  },
  errorMeta: {
    color: colorTokens.mutedText,
    fontSize: 12,
  },
  errorSkills: {
    color: colorTokens.teal,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  errorTitle: {
    color: colorTokens.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  explanation: {
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
    color: colorTokens.mutedText,
    fontSize: 14,
    lineHeight: 22,
    paddingTop: spacingTokens.md,
  },
  headingCopy: {
    flex: 1,
    gap: spacingTokens.xs,
  },
  originalAnswer: {
    color: colorTokens.danger,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
});
