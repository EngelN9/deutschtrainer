import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { calculateLearningAnalytics, getMasteryBand } from "@deutschtrainer/learning-engine";
import type { ErrorType } from "@deutschtrainer/shared-types";
import {
  BarChart3,
  BookCheck,
  Clock3,
  FilePenLine,
  Target,
  TriangleAlert,
} from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../src/features/auth/AuthGate";
import { useLearningRecords } from "../src/features/learning-records/useLearningRecords";
import { ContentScreen } from "../src/components/ContentScreen";
import { MainNavigation } from "../src/components/MainNavigation";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { ProgressBar } from "../src/components/ProgressBar";
import { StatePanel } from "../src/components/StatePanel";
import { useWritingWorkspace } from "../src/features/writing/useWritingWorkspace";
import { errorTypeLabel } from "../src/features/writing/writingLabels";

export default function AnalyticsScreen() {
  const router = useRouter();
  const recordsQuery = useLearningRecords();
  const writingQuery = useWritingWorkspace();
  const analytics = recordsQuery.data ? calculateLearningAnalytics(recordsQuery.data) : undefined;
  const weakestSkills = recordsQuery.data?.mastery
    .toSorted((left, right) => left.masteryScore - right.masteryScore)
    .slice(0, 5);
  const maximumDailyAttempts = Math.max(
    1,
    ...(analytics?.dailyActivity.map((day) => day.attemptCount) ?? []),
  );
  const writingErrorCounts = new Map<ErrorType, number>();
  for (const error of writingQuery.data?.submissions.flatMap((submission) =>
    submission.versions.flatMap((version) => version.feedback?.inlineErrors ?? []),
  ) ?? []) {
    writingErrorCounts.set(error.type, (writingErrorCounts.get(error.type) ?? 0) + 1);
  }
  const commonWritingErrors = [...writingErrorCounts.entries()]
    .toSorted((left, right) => right[1] - left[1])
    .slice(0, 5);

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description="從作答品質、技能掌握度與複習負荷觀察真正的學習進展。"
        eyebrow="學習分析"
        title="你的學習狀態"
      >
        {recordsQuery.isLoading ? (
          <StatePanel message="正在計算學習指標..." state="loading" title="同步分析" />
        ) : recordsQuery.isError ? (
          <StatePanel
            message={recordsQuery.error?.message ?? "學習分析暫時無法載入。"}
            onRetry={() => void recordsQuery.refetch()}
            state="error"
            title="無法載入分析"
          />
        ) : analytics ? (
          <>
            <View style={styles.metricsGrid}>
              <Metric
                color={colorTokens.primary}
                icon={Target}
                label="作答正確率"
                value={`${analytics.accuracyPercent}%`}
              />
              <Metric
                color={colorTokens.teal}
                icon={Clock3}
                label="累積學習"
                value={`${analytics.learningMinutes} 分`}
              />
              <Metric
                color={colorTokens.accent}
                icon={BookCheck}
                label="技能掌握"
                value={`${analytics.masteredSkillCount}/${analytics.trackedSkillCount}`}
              />
              <Metric
                color={colorTokens.danger}
                icon={TriangleAlert}
                label="錯誤紀錄"
                value={`${analytics.errorCount} 筆`}
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <BarChart3 color={colorTokens.teal} size={20} />
                <Text style={styles.sectionTitle}>最近七天</Text>
              </View>
              <View style={styles.chart}>
                {analytics.dailyActivity.map((day) => (
                  <View key={day.date} style={styles.chartColumn}>
                    <Text style={styles.chartValue}>{day.attemptCount}</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: Math.max(
                              4,
                              Math.round((day.attemptCount / maximumDailyAttempts) * 88),
                            ),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.chartLabel}>{formatDay(day.date)}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <FilePenLine color={colorTokens.accent} size={20} />
                <Text style={styles.sectionTitle}>作文常見錯誤</Text>
              </View>
              {writingQuery.isLoading ? (
                <Text style={styles.emptyText}>正在整理作文錯誤...</Text>
              ) : commonWritingErrors.length > 0 ? (
                <View style={styles.writingErrorList}>
                  {commonWritingErrors.map(([type, count]) => (
                    <View key={type} style={styles.writingErrorRow}>
                      <Text style={styles.writingErrorName}>{errorTypeLabel(type)}</Text>
                      <Text style={styles.writingErrorCount}>{count} 次</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>完成作文批改後，重複出現的錯誤會顯示在這裡。</Text>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeadingBetween}>
                <Text style={styles.sectionTitle}>優先加強技能</Text>
                <Text style={styles.averageScore}>平均 {analytics.averageMasteryScore} 分</Text>
              </View>
              {weakestSkills && weakestSkills.length > 0 ? (
                <View style={styles.masteryList}>
                  {weakestSkills.map((mastery) => (
                    <View key={mastery.skillId} style={styles.masteryRow}>
                      <View style={styles.masteryHeading}>
                        <View style={styles.masteryCopy}>
                          <Text style={styles.masteryName}>
                            {recordsQuery.data?.skillNames[mastery.skillId] ?? "相關技能"}
                          </Text>
                          <Text style={styles.masteryBand}>
                            {masteryBandLabel(getMasteryBand(mastery.masteryScore))}
                          </Text>
                        </View>
                        <Text style={styles.masteryScore}>{Math.round(mastery.masteryScore)}</Text>
                      </View>
                      <ProgressBar
                        accessibilityLabel={`${recordsQuery.data?.skillNames[mastery.skillId] ?? "技能"}掌握度`}
                        percent={mastery.masteryScore}
                        tone={mastery.masteryScore >= 75 ? "success" : "primary"}
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>完成第一題後，技能掌握度會開始累積。</Text>
              )}
            </View>

            <PrimaryButton
              accessibilityLabel="查看全部錯題紀錄"
              onPress={() => router.push("/errors" as Href)}
              variant="secondary"
            >
              查看全部錯題
            </PrimaryButton>
          </>
        ) : null}
        <MainNavigation />
      </ContentScreen>
    </AuthGate>
  );
}

function Metric({
  color,
  icon: Icon,
  label,
  value,
}: {
  color: string;
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metric}>
      <Icon color={color} size={21} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function formatDay(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("zh-TW", { weekday: "short" }).format(date).replace("週", "");
}

function masteryBandLabel(band: string): string {
  const labels: Record<string, string> = {
    not_mastered: "尚未掌握",
    initial_understanding: "初步理解",
    partially_mastered: "部分掌握",
    stable_mastery: "穩定掌握",
    high_mastery: "高度掌握",
  };
  return labels[band] ?? "持續累積";
}

const styles = StyleSheet.create({
  averageScore: {
    color: colorTokens.mutedText,
    fontSize: 13,
    fontWeight: "700",
  },
  bar: {
    backgroundColor: colorTokens.teal,
    borderRadius: 3,
    width: "100%",
  },
  barTrack: {
    flex: 1,
    justifyContent: "flex-end",
    width: 18,
  },
  chart: {
    flexDirection: "row",
    gap: spacingTokens.sm,
    height: 140,
    justifyContent: "space-between",
  },
  chartColumn: {
    alignItems: "center",
    flex: 1,
    gap: spacingTokens.xs,
  },
  chartLabel: {
    color: colorTokens.mutedText,
    fontSize: 11,
    fontWeight: "700",
  },
  chartValue: {
    color: colorTokens.text,
    fontSize: 11,
    fontWeight: "800",
  },
  emptyText: {
    color: colorTokens.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  masteryBand: {
    color: colorTokens.mutedText,
    fontSize: 12,
  },
  masteryCopy: {
    flex: 1,
    gap: spacingTokens.xs,
  },
  masteryHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.md,
  },
  masteryList: {
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
  },
  masteryName: {
    color: colorTokens.text,
    fontSize: 15,
    fontWeight: "800",
  },
  masteryRow: {
    borderBottomColor: colorTokens.border,
    borderBottomWidth: 1,
    gap: spacingTokens.sm,
    paddingVertical: spacingTokens.md,
  },
  masteryScore: {
    color: colorTokens.primary,
    fontSize: 18,
    fontWeight: "900",
  },
  metric: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: spacingTokens.xs,
    minHeight: 112,
    padding: spacingTokens.md,
  },
  metricLabel: {
    color: colorTokens.mutedText,
    fontSize: 13,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.md,
  },
  metricValue: {
    color: colorTokens.text,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  section: {
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
    gap: spacingTokens.md,
    paddingTop: spacingTokens.lg,
  },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.sm,
  },
  sectionHeadingBetween: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.md,
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colorTokens.text,
    fontSize: 17,
    fontWeight: "800",
  },
  writingErrorCount: {
    color: colorTokens.accent,
    fontSize: 14,
    fontWeight: "900",
  },
  writingErrorList: {
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
  },
  writingErrorName: {
    color: colorTokens.text,
    fontSize: 15,
    fontWeight: "700",
  },
  writingErrorRow: {
    alignItems: "center",
    borderBottomColor: colorTokens.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingVertical: spacingTokens.sm,
  },
});
