import type { ReactNode } from "react";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import {
  BookOpen,
  Clock3,
  FilePenLine,
  LogOut,
  RotateCcw,
  Settings,
  UserPlus,
} from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { calculateLearningAnalytics } from "@deutschtrainer/learning-engine";
import { colorTokens, radiusTokens, spacingTokens } from "@deutschtrainer/ui";
import { AppText } from "../src/components/AppText";
import { ContentScreen } from "../src/components/ContentScreen";
import { IconButton } from "../src/components/IconButton";
import { MessageBanner } from "../src/components/MessageBanner";
import { NextStepCard } from "../src/components/NextStepCard";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { ProgressBar } from "../src/components/ProgressBar";
import { StatePanel } from "../src/components/StatePanel";
import { AuthGate } from "../src/features/auth/AuthGate";
import { useAuthStore } from "../src/features/auth/useAuthStore";
import { getLessonExercises } from "../src/features/courses/courseRepository";
import { useCourseCatalog } from "../src/features/courses/useCourseCatalog";
import { selectHomeRecommendation } from "../src/features/learner-ui/homeRecommendation";
import { useLearningRecords } from "../src/features/learning-records/useLearningRecords";
import { useConnectivityStore } from "../src/features/offline/connectivityStore";
import { OfflineStatusBand } from "../src/features/offline/OfflineStatusBand";
import { getLessonCompletionPercent } from "../src/features/progress/progressModel";
import { useProgressStore } from "../src/features/progress/useProgressStore";
import { useUserSettings } from "../src/features/settings/useUserSettings";
import { useWritingWorkspace } from "../src/features/writing/useWritingWorkspace";
import { useLearningSetupStore } from "../src/state/useLearningSetupStore";

export default function HomeScreen() {
  const router = useRouter();
  const authMode = useAuthStore((state) => state.authMode);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const noticeMessage = useAuthStore((state) => state.noticeMessage);
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);
  const isGuestSession = useAuthStore((state) => state.session?.user.is_anonymous === true);
  const currentLevel = useLearningSetupStore((state) => state.currentLevel);
  const targetLevel = useLearningSetupStore((state) => state.targetLevel);
  const catalogQuery = useCourseCatalog();
  const recordsQuery = useLearningRecords();
  const settingsQuery = useUserSettings();
  const writingQuery = useWritingWorkspace({ enabled: authMode === "supabase" });
  const connectivityStatus = useConnectivityStore((state) => state.status);
  const userProgress = useProgressStore((state) =>
    profile ? state.byUserId[profile.id] : undefined,
  );
  const allLessons =
    catalogQuery.data?.courses.flatMap((course) => course.units.flatMap((unit) => unit.lessons)) ??
    [];
  const preferredLessons = allLessons.filter((lesson) => lesson.level === currentLevel);
  const learningRecords = recordsQuery.data;
  const analytics = learningRecords ? calculateLearningAnalytics(learningRecords) : undefined;
  const continueLesson =
    preferredLessons.find((lesson) => {
      const remote = learningRecords?.lessonProgress.find((item) => item.lessonId === lesson.id);
      return remote
        ? remote.status !== "completed"
        : !userProgress?.lessons[lesson.id]?.completedAt;
    }) ??
    preferredLessons[0] ??
    allLessons[0];
  const exercises = continueLesson ? getLessonExercises(continueLesson) : [];
  const localLessonProgress = continueLesson ? userProgress?.lessons[continueLesson.id] : undefined;
  const remoteLessonProgress = continueLesson
    ? learningRecords?.lessonProgress.find((item) => item.lessonId === continueLesson.id)
    : undefined;
  const lessonPercent = remoteLessonProgress
    ? Math.round(remoteLessonProgress.completionPercent)
    : getLessonCompletionPercent(localLessonProgress, exercises.length);
  const pendingWriting = [...(writingQuery.data?.submissions ?? [])]
    .filter((submission) => submission.status === "revision_requested")
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0];
  const pendingWritingPrompt = writingQuery.data?.prompts.find(
    (prompt) => prompt.id === pendingWriting?.promptId,
  );
  const recommendedWritingPrompt = writingQuery.data?.prompts.find(
    (prompt) => prompt.level === currentLevel,
  );
  const recommendation = selectHomeRecommendation({
    authMode,
    continueLesson,
    pendingWriting,
    pendingWritingPrompt,
    recommendedWritingPrompt,
    writingState:
      connectivityStatus === "offline"
        ? "offline"
        : writingQuery.isError
          ? "failed"
          : writingQuery.isLoading
            ? "loading"
            : writingQuery.isStale
              ? "stale"
              : "ready",
  });
  const weeklyMinutes =
    analytics?.dailyActivity.reduce((total, day) => total + day.learningMinutes, 0) ?? 0;
  const weeklyAttempts =
    analytics?.dailyActivity.reduce((total, day) => total + day.attemptCount, 0) ?? 0;
  const dailyMinutes = settingsQuery.data?.learning.dailyMinutes ?? 20;

  function openLesson(lessonId: string) {
    router.push({ pathname: "/lesson/[lessonId]", params: { lessonId } } as Href);
  }

  function openRecommendation() {
    if (recommendation.kind === "writing_revision") {
      router.push({
        pathname: "/writing/[submissionId]",
        params: { submissionId: recommendation.submission.id },
      } as Href);
    } else if (recommendation.kind === "writing_prompt") {
      router.push({
        pathname: "/writing/editor/[promptId]",
        params: { promptId: recommendation.prompt.id },
      } as Href);
    } else if (recommendation.kind === "lesson") {
      openLesson(recommendation.lesson.id);
    }
  }

  async function handleSignOut() {
    await signOut();
    if (useAuthStore.getState().authMode === null) router.replace("/welcome");
  }

  return (
    <AuthGate mode="protected">
      <ContentScreen
        action={
          <View style={styles.headerActions}>
            <IconButton
              accessibilityLabel="開啟個人設定"
              icon={Settings}
              onPress={() => router.push("/settings" as Href)}
            />
            {isGuestSession ? (
              <IconButton
                accessibilityLabel="建立帳號保留進度"
                icon={UserPlus}
                onPress={() => router.push("/upgrade-account" as Href)}
              />
            ) : (
              <IconButton
                accessibilityLabel="登出帳號"
                icon={LogOut}
                onPress={() => void handleSignOut()}
                tone="danger"
              />
            )}
          </View>
        }
        description={`先完成最值得做的一步，再決定是否繼續。今日目標約 ${dailyMinutes} 分鐘。`}
        eyebrow="今日學習"
        showMainNavigation
        title={`你好，${profile?.displayName || "學習者"}`}
      >
        <MessageBanner message={errorMessage} tone="error" />
        <MessageBanner message={noticeMessage} tone="info" />
        <MessageBanner
          message={
            authMode === "demo"
              ? "離線 Demo：資料只保存在這台裝置；AI、教室與雲端同步未開放。"
              : null
          }
          tone="info"
        />
        <MessageBanner
          message={
            isGuestSession
              ? "訪客進度目前保存在匿名帳號中；完成 Email 確認前仍適用訪客限制。"
              : null
          }
          tone="info"
        />
        <MessageBanner message={recordsQuery.error?.message ?? null} tone="error" />
        <MessageBanner
          message={authMode === "supabase" ? (writingQuery.error?.message ?? null) : null}
          tone="error"
        />
        <OfflineStatusBand />

        {catalogQuery.isLoading ? (
          <StatePanel message="正在整理最適合你的下一步..." state="loading" title="準備今日建議" />
        ) : recommendation.kind === "empty" ? (
          <StatePanel message="目前沒有可開始的已發布活動。" state="empty" title="暫無建議" />
        ) : (
          <NextStepCard
            accessibilityLabel={
              recommendation.kind === "writing_revision"
                ? "繼續德文重寫"
                : recommendation.kind === "writing_prompt"
                  ? "開始德文寫作"
                  : "開始建議課堂"
            }
            actionLabel={
              recommendation.kind === "writing_revision"
                ? "繼續重寫"
                : recommendation.kind === "writing_prompt"
                  ? "開始寫作"
                  : lessonPercent > 0
                    ? "繼續課堂"
                    : "開始課堂"
            }
            description={
              recommendation.kind === "writing_revision"
                ? "回到上一稿，先處理最重要的修改重點，再比較新版。"
                : recommendation.kind === "writing_prompt"
                  ? "完成一篇短文；回饋會先呈現最值得修正的重點。"
                  : "依目前程度繼續固定課程，不需要先瀏覽所有功能。"
            }
            eyebrow={
              recommendation.kind === "writing_revision"
                ? "下一步 · 根據回饋重寫"
                : "今天先做這件事"
            }
            icon={recommendation.kind === "lesson" ? BookOpen : FilePenLine}
            meta={
              recommendation.kind === "lesson"
                ? `${recommendation.lesson.level} · ${recommendation.lesson.estimatedMinutes} 分鐘 · ${exercises.length} 題`
                : `${currentLevel} 輸出 · 朝 ${targetLevel} 前進`
            }
            onPress={openRecommendation}
            title={
              recommendation.kind === "writing_revision"
                ? (recommendation.prompt?.titleZhTw ?? "完成德文重寫")
                : recommendation.kind === "writing_prompt"
                  ? recommendation.prompt.titleZhTw
                  : recommendation.lesson.titleZhTw
            }
          />
        )}

        {continueLesson && recommendation.kind !== "lesson" ? (
          <SectionCard eyebrow="搭配課程" title={continueLesson.titleZhTw}>
            <View style={styles.metaRow}>
              <Clock3 color={colorTokens.mutedText} size={18} />
              <AppText tone="muted" variant="bodySmall">
                {continueLesson.level} · {continueLesson.estimatedMinutes} 分鐘 · {exercises.length}{" "}
                題
              </AppText>
              <AppText style={styles.percent} tone="primary" variant="label">
                {lessonPercent}%
              </AppText>
            </View>
            <ProgressBar accessibilityLabel="搭配課堂進度" percent={lessonPercent} />
            <PrimaryButton
              accessibilityLabel="繼續搭配課堂"
              onPress={() => openLesson(continueLesson.id)}
              variant="secondary"
            >
              {lessonPercent > 0 ? "繼續課堂" : "查看課堂"}
            </PrimaryButton>
          </SectionCard>
        ) : null}

        <SectionCard eyebrow="間隔複習" title="到期複習">
          <View style={styles.summaryRow}>
            <RotateCcw color={colorTokens.accent} size={22} />
            <AppText style={styles.summaryValue} variant="heading">
              {analytics?.dueReviewCount ?? 0}
            </AppText>
            <AppText tone="muted">項需要再次確認</AppText>
          </View>
          <PrimaryButton
            accessibilityLabel="查看今日複習"
            onPress={() => router.push("/reviews" as Href)}
            variant="secondary"
          >
            {analytics?.dueReviewCount ? "開始今日複習" : "查看複習安排"}
          </PrimaryButton>
        </SectionCard>

        <SectionCard eyebrow="最近七天" title="學習進度">
          <View style={styles.weekGrid}>
            <SummaryMetric icon={Clock3} label="學習時間" value={`${weeklyMinutes} 分鐘`} />
            <SummaryMetric icon={BookOpen} label="完成作答" value={`${weeklyAttempts} 題`} />
          </View>
          <PrimaryButton
            accessibilityLabel="查看完整學習分析"
            onPress={() => router.push("/analytics" as Href)}
            variant="secondary"
          >
            查看完整分析
          </PrimaryButton>
        </SectionCard>

        <PrimaryButton
          accessibilityLabel="開啟完整課程地圖"
          onPress={() => router.push("/courses")}
          variant="secondary"
        >
          開啟完整課程地圖
        </PrimaryButton>
      </ContentScreen>
    </AuthGate>
  );
}

function SectionCard({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeading}>
        <AppText tone="teal" variant="label">
          {eyebrow}
        </AppText>
        <AppText headingLevel={2} variant="subheading">
          {title}
        </AppText>
      </View>
      {children}
    </View>
  );
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metric}>
      <Icon color={colorTokens.teal} size={20} />
      <AppText variant="heading">{value}</AppText>
      <AppText tone="muted" variant="bodySmall">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", gap: spacingTokens.sm },
  metaRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacingTokens.sm },
  metric: {
    backgroundColor: colorTokens.surfaceMuted,
    borderRadius: radiusTokens.sm,
    flex: 1,
    gap: spacingTokens.xs,
    minWidth: 136,
    padding: spacingTokens.md,
  },
  percent: { marginLeft: "auto" },
  sectionCard: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.md,
    borderWidth: 1,
    gap: spacingTokens.md,
    padding: spacingTokens.lg,
  },
  sectionHeading: { gap: spacingTokens.xs },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.sm,
  },
  summaryValue: { color: colorTokens.accent },
  weekGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacingTokens.md },
});
