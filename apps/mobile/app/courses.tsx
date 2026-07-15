import { useMemo, useState } from "react";
import type { CefrLevel } from "@deutschtrainer/shared-types";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Download, HardDriveDownload, RefreshCw, Trash2 } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../src/features/auth/AuthGate";
import { useAuthStore } from "../src/features/auth/useAuthStore";
import { getLessonExercises } from "../src/features/courses/courseRepository";
import { courseCatalogQueryKey, useCourseCatalog } from "../src/features/courses/useCourseCatalog";
import { courseFingerprint } from "../src/features/offline/offlineModel";
import { OfflineStatusBand } from "../src/features/offline/OfflineStatusBand";
import { useOfflineStore } from "../src/features/offline/useOfflineStore";
import { useProgressStore } from "../src/features/progress/useProgressStore";
import { ContentScreen } from "../src/components/ContentScreen";
import { IconButton } from "../src/components/IconButton";
import { LevelSelector } from "../src/components/LevelSelector";
import { MainNavigation } from "../src/components/MainNavigation";
import { MessageBanner } from "../src/components/MessageBanner";
import { ProgressBar } from "../src/components/ProgressBar";
import { StatePanel } from "../src/components/StatePanel";

export default function CoursesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  const [level, setLevel] = useState<CefrLevel>("B1");
  const [workingCourseId, setWorkingCourseId] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const catalogQuery = useCourseCatalog();
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
                (lesson) => userProgress?.lessons[lesson.id]?.completedAt,
              ).length;
              const percent = Math.round((completedLessons / Math.max(lessons.length, 1)) * 100);

              return (
                <View key={course.id} style={styles.courseBlock}>
                  <View style={styles.courseHeading}>
                    <View style={[styles.levelMark, levelStyle(course.level)]}>
                      <Text style={styles.levelText}>{course.level}</Text>
                    </View>
                    <View style={styles.courseCopy}>
                      <Text style={styles.courseTitle}>{course.titleZhTw}</Text>
                      <Text style={styles.courseTitleDe}>{course.titleDe}</Text>
                    </View>
                  </View>
                  <Text style={styles.description}>{course.descriptionZhTw}</Text>
                  <View style={styles.downloadRow}>
                    <Pressable
                      accessibilityLabel={
                        updateAvailable
                          ? `更新 ${course.titleZhTw} 離線課程`
                          : `下載 ${course.titleZhTw} 離線課程`
                      }
                      accessibilityRole="button"
                      accessibilityState={{ disabled: working }}
                      disabled={working}
                      onPress={() => void handleDownload(course)}
                      style={({ pressed }) => [
                        styles.downloadButton,
                        working ? styles.disabled : null,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      {updateAvailable ? (
                        <RefreshCw color={colorTokens.primary} size={18} />
                      ) : (
                        <Download color={colorTokens.primary} size={18} />
                      )}
                      <Text style={styles.downloadButtonText}>
                        {working
                          ? "處理中"
                          : updateAvailable
                            ? "更新下載"
                            : downloaded
                              ? "重新下載"
                              : "下載課程"}
                      </Text>
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
                    <Text style={styles.downloadStatus}>
                      {updateAvailable ? "有新版本" : downloaded ? "已下載" : "僅線上"}
                    </Text>
                  </View>
                  <View style={styles.progressCopy}>
                    <Text style={styles.meta}>
                      {course.units.length} 個單元 · {lessons.length} 堂課
                    </Text>
                    <Text style={styles.progressText}>{percent}%</Text>
                  </View>
                  <ProgressBar accessibilityLabel={`${course.level} 課程進度`} percent={percent} />
                  <View style={styles.unitList}>
                    {course.units.map((unit) => {
                      const exerciseCount = unit.lessons.reduce(
                        (total, lesson) => total + getLessonExercises(lesson).length,
                        0,
                      );
                      return (
                        <Pressable
                          accessibilityLabel={`查看 ${unit.titleZhTw}`}
                          accessibilityRole="button"
                          key={unit.id}
                          onPress={() =>
                            router.push({
                              pathname: "/unit/[unitId]",
                              params: { unitId: unit.id },
                            } as Href)
                          }
                          style={({ pressed }) => [styles.unitRow, pressed ? styles.pressed : null]}
                        >
                          <View style={styles.unitCopy}>
                            <Text style={styles.unitTitle}>{unit.titleZhTw}</Text>
                            <Text style={styles.meta}>
                              {unit.lessons.length} 堂課 · {exerciseCount} 題
                            </Text>
                          </View>
                          <ChevronRight color={colorTokens.mutedText} size={20} />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <MainNavigation />
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
  courseTitle: {
    color: colorTokens.text,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 29,
  },
  courseTitleDe: {
    color: colorTokens.mutedText,
    fontSize: 15,
    lineHeight: 21,
  },
  description: {
    color: colorTokens.mutedText,
    fontSize: 15,
    lineHeight: 23,
  },
  disabled: {
    opacity: 0.45,
  },
  downloadButton: {
    alignItems: "center",
    borderColor: colorTokens.border,
    borderRadius: 8,
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
  downloadStatus: {
    color: colorTokens.mutedText,
    fontSize: 13,
  },
  levelB1: { backgroundColor: colorTokens.teal },
  levelB2: { backgroundColor: colorTokens.primary },
  levelC1: { backgroundColor: colorTokens.accent },
  levelC2: { backgroundColor: colorTokens.danger },
  levelMark: {
    alignItems: "center",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  levelText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  meta: {
    color: colorTokens.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.72,
  },
  progressCopy: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressText: {
    color: colorTokens.primary,
    fontSize: 13,
    fontWeight: "800",
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
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.md,
    minHeight: 72,
    padding: spacingTokens.md,
  },
  unitTitle: {
    color: colorTokens.text,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 23,
  },
});
