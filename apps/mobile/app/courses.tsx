import { useMemo, useState } from "react";
import type { CefrLevel } from "@deutschtrainer/shared-types";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Download, HardDriveDownload, RefreshCw, Trash2 } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { colorTokens, radiusTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../src/features/auth/AuthGate";
import { useAuthStore } from "../src/features/auth/useAuthStore";
import { getLessonExercises } from "../src/features/courses/courseRepository";
import { courseCatalogQueryKey, useCourseCatalog } from "../src/features/courses/useCourseCatalog";
import { courseFingerprint } from "../src/features/offline/offlineModel";
import { OfflineStatusBand } from "../src/features/offline/OfflineStatusBand";
import { useOfflineStore } from "../src/features/offline/useOfflineStore";
import { useProgressStore } from "../src/features/progress/useProgressStore";
import { ContentScreen } from "../src/components/ContentScreen";
import { AppText } from "../src/components/AppText";
import { IconButton } from "../src/components/IconButton";
import { LevelSelector } from "../src/components/LevelSelector";
import { MessageBanner } from "../src/components/MessageBanner";
import { ProgressBar } from "../src/components/ProgressBar";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { StatePanel } from "../src/components/StatePanel";
import { StatusChip } from "../src/components/StatusChip";
import { useLearningRecords } from "../src/features/learning-records/useLearningRecords";
import { useConnectivityStore } from "../src/features/offline/connectivityStore";
import {
  findContinueLesson,
  resolveCourseLearningStatus,
  resolveLessonLearningStatus,
  resolveOfflineAvailability,
} from "../src/features/learner-ui/coursePresentation";
import { useBrowseStateStore } from "../src/features/learner-ui/useBrowseStateStore";
import { useLearningSetupStore } from "../src/state/useLearningSetupStore";

export default function CoursesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  const currentLevel = useLearningSetupStore((state) => state.currentLevel);
  const storedLevel = useBrowseStateStore((state) => state.courseLevel);
  const scrollOffset = useBrowseStateStore((state) => state.courseScrollOffset);
  const setLevel = useBrowseStateStore((state) => state.setCourseLevel);
  const setScrollOffset = useBrowseStateStore((state) => state.setCourseScrollOffset);
  const level: CefrLevel = storedLevel ?? currentLevel;
  const [workingCourseId, setWorkingCourseId] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const catalogQuery = useCourseCatalog();
  const recordsQuery = useLearningRecords();
  const offline = useConnectivityStore((state) => state.status === "offline");
  const offlineProfile = useOfflineStore((state) =>
    profile ? state.profiles[profile.id] : undefined,
  );
  const downloadCourse = useOfflineStore((state) => state.downloadCourse);
  const removeCourse = useOfflineStore((state) => state.removeCourse);
  const userProgress = useProgressStore((state) =>
    profile ? state.byUserId[profile.id] : undefined,
  );
  const courses = useMemo(
    () => catalogQuery.data?.courses.filter((course) => course.level === level) ?? [],
    [catalogQuery.data, level],
  );

  async function handleDownload(course: NonNullable<(typeof courses)[number]>) {
    if (!profile || workingCourseId) {
      return;
    }
    setWorkingCourseId(course.id);
    setActionError(undefined);
    try {
      await downloadCourse(profile.id, course);
      await queryClient.invalidateQueries({ queryKey: courseCatalogQueryKey(profile.id) });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "無法保存離線課程。");
    } finally {
      setWorkingCourseId(undefined);
    }
  }

  async function handleRemove(courseId: string) {
    if (!profile || workingCourseId) {
      return;
    }
    setWorkingCourseId(courseId);
    setActionError(undefined);
    try {
      await removeCourse(profile.id, courseId);
      await queryClient.invalidateQueries({ queryKey: courseCatalogQueryKey(profile.id) });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "無法移除離線課程。");
    } finally {
      setWorkingCourseId(undefined);
    }
  }

  return (
    <AuthGate mode="protected">
      <ContentScreen
        action={
          <IconButton
            accessibilityLabel="開啟離線與同步管理"
            icon={HardDriveDownload}
            onPress={() => router.push("/offline" as Href)}
          />
        }
        description="依程度探索主題單元，下載後可離線閱讀並完成固定題。"
        eyebrow="課程地圖"
        initialScrollOffset={scrollOffset}
        onScrollOffsetChange={setScrollOffset}
        showMainNavigation
        title="德語能力路徑"
      >
        <OfflineStatusBand />
        <MessageBanner message={actionError ?? null} tone="error" />
        <LevelSelector onChange={setLevel} value={level} />
        {catalogQuery.isLoading ? (
          <StatePanel message="正在整理課程與題目..." state="loading" title="載入課程" />
        ) : catalogQuery.isError ? (
          <StatePanel
            message={catalogQuery.error.message}
            onRetry={() => void catalogQuery.refetch()}
            state="error"
            title="課程載入失敗"
          />
        ) : courses.length === 0 ? (
          <StatePanel message="這個程度目前沒有已發布課程。" state="empty" title="尚無課程" />
        ) : (
          <View style={styles.courseList}>
            {courses.map((course) => {
              const downloaded = offlineProfile?.downloadedCourses[course.id];
              const updateAvailable = Boolean(
                downloaded && downloaded.fingerprint !== courseFingerprint(course),
              );
              const working = workingCourseId === course.id;
              const lessons = course.units.flatMap((unit) => unit.lessons);
              const completedLessons = lessons.filter(
                (lesson) =>
                  recordsQuery.data?.lessonProgress.some(
                    (progress) =>
                      progress.lessonId === lesson.id && progress.status === "completed",
                  ) || userProgress?.lessons[lesson.id]?.completedAt,
              ).length;
              const percent = Math.round((completedLessons / Math.max(lessons.length, 1)) * 100);
              const learningStatus = resolveCourseLearningStatus(
                course,
                recordsQuery.data?.lessonProgress ?? [],
                userProgress?.lessons,
              );
              const offlineAvailability = resolveOfflineAvailability({
                downloaded: Boolean(downloaded),
                offline,
                updateAvailable,
              });
              const nextLesson = findContinueLesson(
                course,
                recordsQuery.data?.lessonProgress ?? [],
                userProgress?.lessons,
              );

              return (
                <View key={course.id} style={styles.courseBlock}>
                  <View style={styles.courseHeading}>
                    <View style={[styles.levelMark, levelStyle(course.level)]}>
                      <AppText style={styles.levelText} variant="label">
                        {course.level}
                      </AppText>
                    </View>
                    <View style={styles.courseCopy}>
                      <AppText headingLevel={2} variant="heading">
                        {course.titleZhTw}
                      </AppText>
                      <AppText tone="muted">{course.titleDe}</AppText>
                    </View>
                  </View>
                  <AppText tone="muted">{course.descriptionZhTw}</AppText>
                  <View style={styles.statusRow}>
                    <StatusChip
                      tone={
                        learningStatus === "completed"
                          ? "success"
                          : learningStatus === "in_progress"
                            ? "primary"
                            : "neutral"
                      }
                    >
                      {learningStatus === "completed"
                        ? "已完成"
                        : learningStatus === "in_progress"
                          ? "進行中"
                          : "尚未開始"}
                    </StatusChip>
                    <StatusChip
                      tone={
                        offlineAvailability === "downloaded"
                          ? "success"
                          : offlineAvailability === "update_available"
                            ? "warning"
                            : offlineAvailability === "offline_unavailable"
                              ? "danger"
                              : "neutral"
                      }
                    >
                      {offlineAvailability === "downloaded"
                        ? "可離線使用"
                        : offlineAvailability === "update_available"
                          ? "有新版本"
                          : offlineAvailability === "offline_unavailable"
                            ? "離線時無法使用"
                            : "僅線上"}
                    </StatusChip>
                  </View>
                  <View style={styles.downloadRow}>
                    <Pressable
                      accessibilityLabel={
                        updateAvailable
                          ? `更新 ${course.titleZhTw} 離線課程`
                          : `下載 ${course.titleZhTw} 離線課程`
                      }
                      accessibilityRole="button"
                      accessibilityHint={offline ? "連線後才能下載課程" : undefined}
                      accessibilityState={{ disabled: working || offline }}
                      disabled={working || offline}
                      onPress={() => void handleDownload(course)}
                      style={({ pressed }) => [
                        styles.downloadButton,
                        working || offline ? styles.disabled : null,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      {updateAvailable ? (
                        <RefreshCw color={colorTokens.primary} size={18} />
                      ) : (
                        <Download color={colorTokens.primary} size={18} />
                      )}
                      <AppText style={styles.downloadButtonText} variant="label">
                        {working
                          ? "處理中"
                          : updateAvailable
                            ? "更新下載"
                            : downloaded
                              ? "重新下載"
                              : "下載課程"}
                      </AppText>
                    </Pressable>
                    {downloaded ? (
                      <IconButton
                        accessibilityLabel={`移除 ${course.titleZhTw} 離線課程`}
                        disabled={working}
                        icon={Trash2}
                        onPress={() => void handleRemove(course.id)}
                        tone="danger"
                      />
                    ) : null}
                    <AppText tone="muted" variant="caption">
                      {updateAvailable ? "有新版本" : downloaded ? "已下載" : "僅線上"}
                    </AppText>
                  </View>
                  <View style={styles.progressCopy}>
                    <AppText tone="muted" variant="caption">
                      {course.units.length} 個單元 · {lessons.length} 堂課
                    </AppText>
                    <AppText tone="primary" variant="label">
                      {percent}%
                    </AppText>
                  </View>
                  <ProgressBar accessibilityLabel={`${course.level} 課程進度`} percent={percent} />
                  <View style={styles.unitList}>
                    {course.units.map((unit) => {
                      const exerciseCount = unit.lessons.reduce(
                        (total, lesson) => total + getLessonExercises(lesson).length,
                        0,
                      );
                      const unitStatuses = unit.lessons.map((lesson) =>
                        resolveLessonLearningStatus(
                          lesson.id,
                          recordsQuery.data?.lessonProgress.find(
                            (progress) => progress.lessonId === lesson.id,
                          ),
                          userProgress?.lessons[lesson.id],
                        ),
                      );
                      const unitStatus = unitStatuses.every((status) => status === "completed")
                        ? "completed"
                        : unitStatuses.some(
                              (status) => status === "in_progress" || status === "completed",
                            )
                          ? "in_progress"
                          : "not_started";
                      return (
                        <Pressable
                          accessibilityLabel={`查看 ${unit.titleZhTw}`}
                          accessibilityRole="button"
                          accessibilityState={{
                            disabled: offlineAvailability === "offline_unavailable",
                          }}
                          disabled={offlineAvailability === "offline_unavailable"}
                          key={unit.id}
                          onPress={() =>
                            router.push({
                              pathname: "/unit/[unitId]",
                              params: { unitId: unit.id },
                            } as Href)
                          }
                          style={({ pressed }) => [
                            styles.unitRow,
                            offlineAvailability === "offline_unavailable" ? styles.disabled : null,
                            pressed ? styles.pressed : null,
                          ]}
                        >
                          <View style={styles.unitCopy}>
                            <AppText variant="subheading">{unit.titleZhTw}</AppText>
                            <AppText tone="muted" variant="caption">
                              {unit.lessons.length} 堂課 · {exerciseCount} 題
                            </AppText>
                          </View>
                          <AppText
                            tone={unitStatus === "completed" ? "teal" : "muted"}
                            variant="caption"
                          >
                            {unitStatus === "completed"
                              ? "已完成"
                              : unitStatus === "in_progress"
                                ? "進行中"
                                : "尚未開始"}
                          </AppText>
                          <ChevronRight color={colorTokens.mutedText} size={20} />
                        </Pressable>
                      );
                    })}
                  </View>
                  {nextLesson ? (
                    <PrimaryButton
                      accessibilityLabel={`${learningStatus === "not_started" ? "開始" : "繼續"} ${course.titleZhTw}`}
                      disabled={offlineAvailability === "offline_unavailable"}
                      onPress={() =>
                        router.push({
                          pathname: "/lesson/[lessonId]",
                          params: { lessonId: nextLesson.id },
                        } as Href)
                      }
                    >
                      {learningStatus === "not_started"
                        ? "開始第一堂課"
                        : learningStatus === "completed"
                          ? "再次練習"
                          : "繼續課程"}
                    </PrimaryButton>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ContentScreen>
    </AuthGate>
  );
}

function levelStyle(level: CefrLevel) {
  switch (level) {
    case "B1":
      return styles.levelB1;
    case "B2":
      return styles.levelB2;
    case "C1":
      return styles.levelC1;
    case "C2":
      return styles.levelC2;
  }
}

const styles = StyleSheet.create({
  courseBlock: {
    borderBottomColor: colorTokens.border,
    borderBottomWidth: 1,
    gap: spacingTokens.md,
    paddingBottom: spacingTokens.xl,
  },
  courseCopy: {
    flex: 1,
    gap: spacingTokens.xs,
  },
  courseHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.md,
  },
  courseList: {
    gap: spacingTokens.xl,
  },
  disabled: {
    opacity: 0.45,
  },
  downloadButton: {
    alignItems: "center",
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.sm,
    minHeight: 44,
    paddingHorizontal: spacingTokens.md,
  },
  downloadButtonText: {
    color: colorTokens.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  downloadRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.sm,
  },
  levelB1: { backgroundColor: colorTokens.teal },
  levelB2: { backgroundColor: colorTokens.primary },
  levelC1: { backgroundColor: colorTokens.accent },
  levelC2: { backgroundColor: colorTokens.danger },
  levelMark: {
    alignItems: "center",
    borderRadius: radiusTokens.sm,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  levelText: {
    color: colorTokens.onStrong,
  },
  pressed: {
    opacity: 0.72,
  },
  progressCopy: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.sm,
  },
  unitCopy: {
    flex: 1,
    gap: spacingTokens.xs,
  },
  unitList: {
    gap: spacingTokens.sm,
  },
  unitRow: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: radiusTokens.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.md,
    minHeight: 72,
    padding: spacingTokens.md,
  },
});
