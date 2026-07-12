import { useMemo, useState } from "react";
import type { CefrLevel } from "@deutschtrainer/shared-types";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../src/features/auth/AuthGate";
import { useAuthStore } from "../src/features/auth/useAuthStore";
import { getLessonExercises } from "../src/features/courses/courseRepository";
import { useCourseCatalog } from "../src/features/courses/useCourseCatalog";
import { useProgressStore } from "../src/features/progress/useProgressStore";
import { ContentScreen } from "../src/components/ContentScreen";
import { LevelSelector } from "../src/components/LevelSelector";
import { MainNavigation } from "../src/components/MainNavigation";
import { ProgressBar } from "../src/components/ProgressBar";
import { StatePanel } from "../src/components/StatePanel";

export default function CoursesScreen() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const [level, setLevel] = useState<CefrLevel>("B1");
  const catalogQuery = useCourseCatalog();
  const userProgress = useProgressStore((state) =>
    profile ? state.byUserId[profile.id] : undefined,
  );
  const courses = useMemo(
    () => catalogQuery.data?.courses.filter((course) => course.level === level) ?? [],
    [catalogQuery.data, level],
  );

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description="依程度探索主題單元，完成課堂後會在本機保留進度。"
        eyebrow="課程地圖"
        title="德語能力路徑"
      >
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
