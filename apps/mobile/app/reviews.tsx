import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { getDueReviews } from "@deutschtrainer/learning-engine";
import { CalendarClock, CheckCircle2, ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../src/features/auth/AuthGate";
import { findExerciseContext } from "../src/features/courses/courseRepository";
import { useCourseCatalog } from "../src/features/courses/useCourseCatalog";
import { useLearningRecords } from "../src/features/learning-records/useLearningRecords";
import { ContentScreen } from "../src/components/ContentScreen";
import { MainNavigation } from "../src/components/MainNavigation";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { StatePanel } from "../src/components/StatePanel";

export default function ReviewsScreen() {
  const router = useRouter();
  const recordsQuery = useLearningRecords();
  const catalogQuery = useCourseCatalog();
  const rawDueReviews = recordsQuery.data ? getDueReviews(recordsQuery.data.reviews) : [];
  const dueReviews = rawDueReviews.filter(
    (review, index, reviews) =>
      reviews.findIndex((candidate) => candidate.exerciseId === review.exerciseId) === index,
  );
  const futureReviews =
    recordsQuery.data?.reviews.filter(
      (review) =>
        review.status === "scheduled" && !rawDueReviews.some(({ id }) => id === review.id),
    ).length ?? 0;
  const isLoading = recordsQuery.isLoading || catalogQuery.isLoading;
  const error = recordsQuery.error ?? catalogQuery.error;

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description="優先處理近期答錯、使用提示或反應較慢的技能。"
        eyebrow="間隔複習"
        title="今日複習"
      >
        <View style={styles.summaryBand}>
          <View style={styles.summaryIcon}>
            <CalendarClock color="#FFFFFF" size={24} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryValue}>{dueReviews.length} 道題待複習</Text>
            <Text style={styles.summaryMeta}>
              {rawDueReviews.length} 個技能到期 · 另有 {futureReviews} 項排入未來
            </Text>
          </View>
        </View>
        {isLoading ? (
          <StatePanel message="正在整理複習優先順序..." state="loading" title="同步複習佇列" />
        ) : error ? (
          <StatePanel
            message={error.message}
            onRetry={() => {
              void recordsQuery.refetch();
              void catalogQuery.refetch();
            }}
            state="error"
            title="無法載入複習"
          />
        ) : dueReviews.length === 0 ? (
          <View style={styles.emptyState}>
            <CheckCircle2 color={colorTokens.success} size={32} />
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>目前沒有到期項目</Text>
              <Text style={styles.emptyText}>完成新題目後，系統會依表現自動安排下一次複習。</Text>
            </View>
          </View>
        ) : (
          <View style={styles.reviewList}>
            {dueReviews.map((review, index) => {
              const context = catalogQuery.data
                ? findExerciseContext(catalogQuery.data, review.exerciseId)
                : undefined;
              return (
                <Pressable
                  accessibilityLabel={`開始複習 ${context?.exercise.title ?? "指定題目"}`}
                  accessibilityRole="button"
                  key={review.id}
                  onPress={() => {
                    if (!context) {
                      return;
                    }
                    router.push({
                      pathname: "/exercise/[lessonId]",
                      params: {
                        lessonId: context.lesson.id,
                        exerciseId: review.exerciseId,
                        reviewId: review.id,
                      },
                    } as Href);
                  }}
                  style={({ pressed }) => [styles.reviewItem, pressed ? styles.pressed : null]}
                >
                  <View style={styles.reviewIndex}>
                    <Text style={styles.reviewIndexText}>{index + 1}</Text>
                  </View>
                  <View style={styles.reviewCopy}>
                    <Text style={styles.reviewReason}>{reviewReasonLabel(review.reason)}</Text>
                    <Text style={styles.reviewTitle}>
                      {context?.exercise.title ?? "課程題目暫時無法對應"}
                    </Text>
                    <Text style={styles.reviewMeta}>
                      {context
                        ? `${context.lesson.level} · ${context.lesson.titleZhTw}`
                        : (recordsQuery.data?.skillNames[review.skillId] ?? "相關技能")}
                    </Text>
                  </View>
                  <ChevronRight color={colorTokens.mutedText} size={21} />
                </Pressable>
              );
            })}
          </View>
        )}
        <PrimaryButton
          accessibilityLabel="查看錯題紀錄"
          onPress={() => router.push("/errors" as Href)}
          variant="secondary"
        >
          查看錯題紀錄
        </PrimaryButton>
        <MainNavigation />
      </ContentScreen>
    </AuthGate>
  );
}

function reviewReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    incorrect_answer: "答錯後加強",
    correct_with_hint: "提示後答對",
    correct_but_slow: "正確但反應較慢",
    correct_and_stable: "穩定記憶確認",
    stable_multiple_times: "多次穩定確認",
    long_term_stable: "長期記憶確認",
  };
  return labels[reason] ?? "技能複習";
}

const styles = StyleSheet.create({
  emptyCopy: {
    flex: 1,
    gap: spacingTokens.xs,
  },
  emptyState: {
    alignItems: "flex-start",
    borderBottomColor: colorTokens.border,
    borderBottomWidth: 1,
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.md,
    paddingVertical: spacingTokens.lg,
  },
  emptyText: {
    color: colorTokens.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  emptyTitle: {
    color: colorTokens.text,
    fontSize: 17,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.72,
  },
  reviewCopy: {
    flex: 1,
    gap: spacingTokens.xs,
  },
  reviewIndex: {
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 6,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  reviewIndexText: {
    color: colorTokens.accent,
    fontSize: 14,
    fontWeight: "900",
  },
  reviewItem: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.md,
    minHeight: 92,
    padding: spacingTokens.md,
  },
  reviewList: {
    gap: spacingTokens.md,
  },
  reviewMeta: {
    color: colorTokens.mutedText,
    fontSize: 13,
  },
  reviewReason: {
    color: colorTokens.accent,
    fontSize: 12,
    fontWeight: "800",
  },
  reviewTitle: {
    color: colorTokens.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  summaryBand: {
    alignItems: "center",
    backgroundColor: "#113B36",
    borderRadius: 8,
    flexDirection: "row",
    gap: spacingTokens.md,
    padding: spacingTokens.md,
  },
  summaryCopy: {
    flex: 1,
    gap: spacingTokens.xs,
  },
  summaryIcon: {
    alignItems: "center",
    backgroundColor: colorTokens.teal,
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  summaryMeta: {
    color: "#D7ECE8",
    fontSize: 13,
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
  },
});
