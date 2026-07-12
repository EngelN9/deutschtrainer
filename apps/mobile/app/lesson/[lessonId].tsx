import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BookOpenCheck, Clock3, Layers3 } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../../src/features/auth/AuthGate";
import { useAuthStore } from "../../src/features/auth/useAuthStore";
import { findLesson, getLessonExercises } from "../../src/features/courses/courseRepository";
import { useCourseCatalog } from "../../src/features/courses/useCourseCatalog";
import { getLessonCompletionPercent } from "../../src/features/progress/progressModel";
import { useProgressStore } from "../../src/features/progress/useProgressStore";
import { ContentScreen } from "../../src/components/ContentScreen";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { ProgressBar } from "../../src/components/ProgressBar";
import { StatePanel } from "../../src/components/StatePanel";
import { TagList } from "../../src/components/TagList";

export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const catalogQuery = useCourseCatalog();
  const lesson = catalogQuery.data ? findLesson(catalogQuery.data, lessonId) : undefined;
  const exercises = lesson ? getLessonExercises(lesson) : [];
  const progress = useProgressStore((state) =>
    profile ? state.byUserId[profile.id]?.lessons[lessonId] : undefined,
  );
  const percent = getLessonCompletionPercent(progress, exercises.length);

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description={lesson?.cefrDescriptor}
        eyebrow={lesson ? `${lesson.level} · 課堂內容` : "課堂內容"}
        showBack
        title={lesson?.titleZhTw ?? "課堂"}
      >
        {catalogQuery.isLoading ? (
          <StatePanel message="正在準備課堂內容..." state="loading" title="載入課堂" />
        ) : catalogQuery.isError ? (
          <StatePanel
            message={catalogQuery.error.message}
            onRetry={() => void catalogQuery.refetch()}
            state="error"
            title="課堂載入失敗"
          />
        ) : !lesson ? (
          <StatePanel message="找不到這堂課，內容可能已更新。" state="empty" title="課堂不存在" />
        ) : (
          <>
            <View style={styles.summaryBand}>
              <View style={styles.metric}>
                <Clock3 color={colorTokens.primary} size={20} />
                <Text style={styles.metricValue}>{lesson.estimatedMinutes} 分鐘</Text>
                <Text style={styles.metricLabel}>預估時間</Text>
              </View>
              <View style={styles.metric}>
                <Layers3 color={colorTokens.teal} size={20} />
                <Text style={styles.metricValue}>{exercises.length} 題</Text>
                <Text style={styles.metricLabel}>固定題型</Text>
              </View>
              <View style={styles.metric}>
                <BookOpenCheck color={colorTokens.accent} size={20} />
                <Text style={styles.metricValue}>v{lesson.version}</Text>
                <Text style={styles.metricLabel}>
                  {lesson.status === "published" ? "已發布" : lesson.status}
                </Text>
              </View>
            </View>
            <View style={styles.progressSection}>
              <View style={styles.sectionHeadingRow}>
                <Text style={styles.sectionTitle}>課堂進度</Text>
                <Text style={styles.progressText}>{percent}%</Text>
              </View>
              <ProgressBar
                accessibilityLabel="課堂進度"
                percent={percent}
                tone={progress?.completedAt ? "success" : "primary"}
              />
            </View>
            <InfoSection title="學習目標">
              {lesson.learningObjectives.map((objective, index) => (
                <View key={objective} style={styles.objectiveRow}>
                  <Text style={styles.objectiveIndex}>{index + 1}</Text>
                  <Text style={styles.objectiveText}>{objective}</Text>
                </View>
              ))}
            </InfoSection>
            <InfoSection title="能力類別">
              <TagList items={lesson.skillCategories.map(skillLabel)} />
            </InfoSection>
            <InfoSection title="核心單字">
              <TagList emptyText="本課沒有額外單字標籤" items={lesson.vocabularyTags} />
            </InfoSection>
            <InfoSection title="文法與表達">
              <TagList emptyText="本課沒有額外文法標籤" items={lesson.grammarTags} />
            </InfoSection>
            <InfoSection title="先備技能">
              <TagList emptyText="這是本單元的起始課堂" items={lesson.prerequisiteSkillIds} />
            </InfoSection>
            <PrimaryButton
              accessibilityLabel={progress?.completedAt ? "重新開啟課堂練習" : "開始或繼續課堂練習"}
              onPress={() =>
                router.push({
                  pathname: "/exercise/[lessonId]",
                  params: { lessonId },
                } as Href)
              }
            >
              {progress?.completedAt ? "查看練習" : percent > 0 ? "繼續課堂" : "開始課堂"}
            </PrimaryButton>
          </>
        )}
      </ContentScreen>
    </AuthGate>
  );
}

function InfoSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.infoSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function skillLabel(value: string) {
  const labels: Record<string, string> = {
    vocabulary: "單字",
    grammar: "文法",
    reading: "閱讀",
    listening: "聽力",
    writing: "寫作",
    speaking: "口說",
    interaction: "互動",
    mediation: "轉述整合",
    pronunciation: "發音",
    exam_preparation: "考試準備",
  };
  return labels[value] ?? value;
}

const styles = StyleSheet.create({
  infoSection: {
    borderBottomColor: colorTokens.border,
    borderBottomWidth: 1,
    gap: spacingTokens.md,
    paddingBottom: spacingTokens.lg,
  },
  metric: {
    alignItems: "center",
    flex: 1,
    gap: spacingTokens.xs,
    minWidth: 88,
  },
  metricLabel: {
    color: colorTokens.mutedText,
    fontSize: 12,
    textAlign: "center",
  },
  metricValue: {
    color: colorTokens.text,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  objectiveIndex: {
    color: colorTokens.primary,
    fontSize: 15,
    fontWeight: "900",
    width: 22,
  },
  objectiveRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacingTokens.sm,
  },
  objectiveText: {
    color: colorTokens.text,
    flex: 1,
    fontSize: 15,
    lineHeight: 23,
  },
  progressSection: {
    gap: spacingTokens.sm,
  },
  progressText: {
    color: colorTokens.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  sectionHeadingRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colorTokens.text,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 24,
  },
  summaryBand: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.md,
    padding: spacingTokens.md,
  },
});
