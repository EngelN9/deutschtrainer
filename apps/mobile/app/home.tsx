import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { BookOpen, Clock3, LogOut, RotateCcw, Settings, Target } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { calculateLearningAnalytics } from "@deutschtrainer/learning-engine";
import { AuthGate } from "../src/features/auth/AuthGate";
import { useAuthStore } from "../src/features/auth/useAuthStore";
import { getLessonExercises } from "../src/features/courses/courseRepository";
import { useCourseCatalog } from "../src/features/courses/useCourseCatalog";
import { getLessonCompletionPercent } from "../src/features/progress/progressModel";
import { useProgressStore } from "../src/features/progress/useProgressStore";
import { useLearningRecords } from "../src/features/learning-records/useLearningRecords";
import { useLearningSetupStore } from "../src/state/useLearningSetupStore";
import { useUserSettings } from "../src/features/settings/useUserSettings";
import { OfflineStatusBand } from "../src/features/offline/OfflineStatusBand";
import { ContentScreen } from "../src/components/ContentScreen";
import { IconButton } from "../src/components/IconButton";
import { MainNavigation } from "../src/components/MainNavigation";
import { MessageBanner } from "../src/components/MessageBanner";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { ProgressBar } from "../src/components/ProgressBar";
import { StatePanel } from "../src/components/StatePanel";

export default function HomeScreen() {
  const router = useRouter();
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const noticeMessage = useAuthStore((state) => state.noticeMessage);
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);
  const currentLevel = useLearningSetupStore((state) => state.currentLevel);
  const targetLevel = useLearningSetupStore((state) => state.targetLevel);
  const catalogQuery = useCourseCatalog();
  const learningRecordsQuery = useLearningRecords();
  const settingsQuery = useUserSettings();
  const userProgress = useProgressStore((state) =>
    profile ? state.byUserId[profile.id] : undefined,
  );
  const allLessons =
    catalogQuery.data?.courses.flatMap((course) => course.units.flatMap((unit) => unit.lessons)) ??
    [];
  const preferredLessons = allLessons.filter((lesson) => lesson.level === currentLevel);
  const learningRecords = learningRecordsQuery.data;
  const analytics = learningRecords ? calculateLearningAnalytics(learningRecords) : undefined;
  const continueLesson =
    preferredLessons.find((lesson) => {
      const remoteProgress = learningRecords?.lessonProgress.find(
        (progress) => progress.lessonId === lesson.id,
      );
      return remoteProgress
        ? remoteProgress.status !== "completed"
        : !userProgress?.lessons[lesson.id]?.completedAt;
    }) ??
    preferredLessons[0] ??
    allLessons[0];
  const exercises = continueLesson ? getLessonExercises(continueLesson) : [];
  const lessonProgress = continueLesson ? userProgress?.lessons[continueLesson.id] : undefined;
  const syncedLessonProgress = continueLesson
    ? learningRecords?.lessonProgress.find((progress) => progress.lessonId === continueLesson.id)
    : undefined;
  const percent = syncedLessonProgress
    ? Math.round(syncedLessonProgress.completionPercent)
    : getLessonCompletionPercent(lessonProgress, exercises.length);
  const today = localDateKey(new Date());
  const completedToday =
    learningRecords?.attempts.filter(
      (attempt) => localDateKey(new Date(attempt.submittedAt)) === today,
    ).length ?? 0;
  const weakestSkill = learningRecords?.mastery.toSorted(
    (left, right) => left.masteryScore - right.masteryScore,
  )[0];
  const dailyMinutes = settingsQuery.data?.learning.dailyMinutes ?? 20;

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
            <IconButton
              accessibilityLabel="登出帳號"
              icon={LogOut}
              onPress={() => void signOut()}
              tone="danger"
            />
          </View>
        }
        description="把今天的時間用在真正會影響德語表達的技能上。"
        eyebrow="今日學習"
        title={`你好，${profile?.displayName || "學習者"}`}
      >
        <MessageBanner message={errorMessage} tone="error" />
        <MessageBanner message={noticeMessage} tone="info" />
        <MessageBanner message={learningRecordsQuery.error?.message ?? null} tone="error" />
        <OfflineStatusBand />
        <View style={styles.goalBand}>
          <View style={styles.goalIcon}>
            <Target color="#FFFFFF" size={23} strokeWidth={2.4} />
          </View>
          <View style={styles.goalCopy}>
            <Text style={styles.goalLabel}>今日目標</Text>
            <Text style={styles.goalValue}>完成 1 堂課 · 約 {dailyMinutes} 分鐘</Text>
            <Text style={styles.goalMeta}>今天已完成 {completedToday} 題</Text>
          </View>
        </View>
        {catalogQuery.isLoading ? (
          <StatePanel message="正在尋找最適合繼續的課堂..." state="loading" title="準備今日課程" />
        ) : catalogQuery.isError ? (
          <StatePanel
            message={catalogQuery.error.message}
            onRetry={() => void catalogQuery.refetch()}
            state="error"
            title="無法載入課程"
          />
        ) : continueLesson ? (
          <View style={styles.continueSection}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionEyebrow}>建議繼續</Text>
                <Text style={styles.lessonTitle}>{continueLesson.titleZhTw}</Text>
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{continueLesson.level}</Text>
              </View>
            </View>
            <View style={styles.lessonMetaRow}>
              <Clock3 color={colorTokens.mutedText} size={16} />
              <Text style={styles.lessonMeta}>
                {continueLesson.estimatedMinutes} 分鐘 · {exercises.length} 題
              </Text>
              <Text style={styles.lessonPercent}>{percent}%</Text>
            </View>
            <ProgressBar accessibilityLabel="建議課堂進度" percent={percent} />
            <PrimaryButton
              accessibilityLabel="繼續建議課堂"
              onPress={() =>
                router.push({
                  pathname: "/lesson/[lessonId]",
                  params: { lessonId: continueLesson.id },
                } as Href)
              }
            >
              {percent > 0 ? "繼續課堂" : "查看課堂"}
            </PrimaryButton>
          </View>
        ) : (
          <StatePanel message="目前沒有可用的已發布課程。" state="empty" title="尚無課程" />
        )}
        <View style={styles.overview}>
          <Text style={styles.overviewTitle}>學習概況</Text>
          <OverviewRow
            icon={BookOpen}
            label="程度路徑"
            value={`${currentLevel} → ${targetLevel}`}
          />
          <OverviewRow
            icon={RotateCcw}
            label="到期複習"
            value={analytics ? `${analytics.dueReviewCount} 項` : "同步中"}
          />
          <OverviewRow
            icon={Clock3}
            label="最近七天"
            value={
              analytics
                ? `${analytics.dailyActivity.reduce((sum, day) => sum + day.learningMinutes, 0)} 分鐘`
                : "同步中"
            }
          />
          <Text style={styles.overviewNote}>
            {weakestSkill
              ? `目前優先加強：${learningRecords?.skillNames[weakestSkill.skillId] ?? "相關技能"}（${Math.round(weakestSkill.masteryScore)} 分）。`
              : "完成第一題後，系統會開始辨識弱項技能。"}
          </Text>
        </View>
        {analytics && analytics.dueReviewCount > 0 ? (
          <PrimaryButton
            accessibilityLabel="開始今日到期複習"
            onPress={() => router.push("/reviews" as Href)}
          >
            開始今日複習
          </PrimaryButton>
        ) : null}
        <PrimaryButton
          accessibilityLabel="開啟完整課程地圖"
          onPress={() => router.push("/courses")}
          variant="secondary"
        >
          開啟完整課程地圖
        </PrimaryButton>
        <MainNavigation />
      </ContentScreen>
    </AuthGate>
  );
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function OverviewRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.overviewRow}>
      <Icon color={colorTokens.teal} size={18} />
      <Text style={styles.overviewLabel}>{label}</Text>
      <Text style={styles.overviewValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  continueSection: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacingTokens.md,
    padding: spacingTokens.lg,
  },
  goalBand: {
    alignItems: "center",
    backgroundColor: "#113B36",
    borderRadius: 8,
    flexDirection: "row",
    gap: spacingTokens.md,
    padding: spacingTokens.md,
  },
  goalCopy: {
    flex: 1,
    gap: spacingTokens.xs,
  },
  goalIcon: {
    alignItems: "center",
    backgroundColor: colorTokens.teal,
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  goalLabel: {
    color: "#BFE3DC",
    fontSize: 13,
    fontWeight: "700",
  },
  goalMeta: {
    color: "#D7ECE8",
    fontSize: 13,
  },
  goalValue: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 23,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacingTokens.sm,
  },
  lessonMeta: {
    color: colorTokens.mutedText,
    flex: 1,
    fontSize: 14,
  },
  lessonMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.sm,
  },
  lessonPercent: {
    color: colorTokens.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  lessonTitle: {
    color: colorTokens.text,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 27,
    marginTop: spacingTokens.xs,
  },
  levelBadge: {
    alignItems: "center",
    backgroundColor: colorTokens.primary,
    borderRadius: 6,
    height: 34,
    justifyContent: "center",
    width: 42,
  },
  levelText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  overview: {
    borderBottomColor: colorTokens.border,
    borderBottomWidth: 1,
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
    gap: spacingTokens.md,
    paddingVertical: spacingTokens.lg,
  },
  overviewLabel: {
    color: colorTokens.mutedText,
    flex: 1,
    fontSize: 14,
  },
  overviewNote: {
    color: colorTokens.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  overviewRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.sm,
  },
  overviewTitle: {
    color: colorTokens.text,
    fontSize: 17,
    fontWeight: "800",
  },
  overviewValue: {
    color: colorTokens.text,
    fontSize: 14,
    fontWeight: "700",
  },
  sectionEyebrow: {
    color: colorTokens.teal,
    fontSize: 13,
    fontWeight: "800",
  },
  sectionHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacingTokens.md,
    justifyContent: "space-between",
  },
});
