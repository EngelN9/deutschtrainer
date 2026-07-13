import { useState } from "react";
import type { WritingFeedback } from "@deutschtrainer/ai-schemas";
import type { WritingRubricDimension } from "@deutschtrainer/shared-types";
import { BookOpen, CheckCircle2, ListChecks, TriangleAlert } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { ProgressBar } from "../../components/ProgressBar";
import { AnnotatedWritingText } from "./AnnotatedWritingText";
import { errorTypeLabel } from "./writingLabels";

interface WritingFeedbackPanelProps {
  feedback: WritingFeedback;
  textDe: string;
}

const rubricDimensions: WritingRubricDimension[] = [
  "taskCompletion",
  "grammar",
  "vocabulary",
  "coherence",
  "cohesion",
  "register",
  "argumentation",
  "style",
  "accuracy",
  "idiomaticity",
];

export function WritingFeedbackPanel({ feedback, textDe }: WritingFeedbackPanelProps) {
  const [selectedError, setSelectedError] = useState(feedback.inlineErrors[0]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.scoreRow}>
        <View style={styles.scoreBlock}>
          <Text style={styles.score}>{feedback.score}</Text>
          <Text style={styles.scoreLabel}>總分 / 100</Text>
        </View>
        <View style={styles.scoreCopy}>
          <Text style={styles.sectionTitle}>能力估計 {feedback.cefrLevelEstimate}</Text>
          <Text style={styles.mutedText}>
            {feedback.inlineErrors.length > 0
              ? `找到 ${feedback.inlineErrors.length} 個可修改位置`
              : "本版沒有需要標記的行內錯誤"}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <TriangleAlert color={colorTokens.danger} size={20} />
          <Text style={styles.sectionTitle}>原文與錯誤位置</Text>
        </View>
        <AnnotatedWritingText
          errors={feedback.inlineErrors}
          onSelectError={setSelectedError}
          selectedError={selectedError}
          textDe={textDe}
        />
        {selectedError ? (
          <View style={styles.errorDetail}>
            <View style={styles.errorHeading}>
              <Text style={styles.errorType}>{errorTypeLabel(selectedError.type)}</Text>
              <Text style={styles.severity}>{severityLabel(selectedError.severity)}</Text>
            </View>
            <Text style={styles.correction}>{selectedError.correction}</Text>
            <Text style={styles.explanation}>{selectedError.explanationZhTw}</Text>
          </View>
        ) : (
          <Text style={styles.mutedText}>原文沒有需要標記的錯誤，請繼續參考分項回饋。</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <ListChecks color={colorTokens.primary} size={20} />
          <Text style={styles.sectionTitle}>分項評分</Text>
        </View>
        <View style={styles.rubricList}>
          {rubricDimensions.map((dimension) => (
            <View key={dimension} style={styles.rubricRow}>
              <View style={styles.rubricHeading}>
                <Text style={styles.rubricLabel}>{rubricLabel(dimension)}</Text>
                <Text style={styles.rubricScore}>{feedback.rubricScores[dimension]}</Text>
              </View>
              <ProgressBar
                accessibilityLabel={`${rubricLabel(dimension)}分數`}
                percent={feedback.rubricScores[dimension]}
                tone={feedback.rubricScores[dimension] >= 80 ? "success" : "primary"}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <CheckCircle2 color={colorTokens.success} size={20} />
          <Text style={styles.sectionTitle}>做得好的地方</Text>
        </View>
        {feedback.strengths.map((strength) => (
          <Text key={strength} style={styles.listItem}>
            • {strength}
          </Text>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <ListChecks color={colorTokens.accent} size={20} />
          <Text style={styles.sectionTitle}>下一版修改任務</Text>
        </View>
        {feedback.revisionTasks.map((task, index) => (
          <Text key={`${index}-${task}`} style={styles.listItem}>
            {index + 1}. {task}
          </Text>
        ))}
        {feedback.repeatedErrorTypes.length > 0 ? (
          <View style={styles.repeatRow}>
            <Text style={styles.repeatLabel}>重複錯誤</Text>
            {feedback.repeatedErrorTypes.map((type) => (
              <Pressable accessibilityRole="text" key={type} style={styles.repeatTag}>
                <Text style={styles.repeatText}>{errorTypeLabel(type)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {feedback.referenceVersion ? (
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <BookOpen color={colorTokens.teal} size={20} />
            <Text style={styles.sectionTitle}>完整參考版本</Text>
          </View>
          <Text selectable style={styles.referenceText}>
            {feedback.referenceVersion}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function rubricLabel(dimension: WritingRubricDimension): string {
  return {
    taskCompletion: "任務完成",
    grammar: "文法",
    vocabulary: "詞彙",
    coherence: "內容連貫",
    cohesion: "篇章銜接",
    register: "語域",
    argumentation: "論證",
    style: "風格",
    accuracy: "準確度",
    idiomaticity: "道地程度",
  }[dimension];
}

function severityLabel(severity: WritingFeedback["inlineErrors"][number]["severity"]): string {
  return {
    minor: "輕微",
    moderate: "中等",
    major: "主要",
    critical: "關鍵",
  }[severity];
}

const styles = StyleSheet.create({
  correction: {
    color: colorTokens.success,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 24,
  },
  errorDetail: {
    backgroundColor: "#FFF7ED",
    borderLeftColor: colorTokens.accent,
    borderLeftWidth: 4,
    gap: spacingTokens.sm,
    padding: spacingTokens.md,
  },
  errorHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.sm,
  },
  errorType: {
    color: colorTokens.text,
    fontSize: 15,
    fontWeight: "900",
  },
  explanation: {
    color: colorTokens.text,
    fontSize: 15,
    lineHeight: 23,
  },
  listItem: {
    color: colorTokens.text,
    fontSize: 15,
    lineHeight: 24,
  },
  mutedText: {
    color: colorTokens.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
  referenceText: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderRadius: 8,
    borderWidth: 1,
    color: colorTokens.text,
    fontSize: 16,
    lineHeight: 27,
    padding: spacingTokens.md,
  },
  repeatLabel: {
    color: colorTokens.mutedText,
    fontSize: 13,
    fontWeight: "800",
    width: "100%",
  },
  repeatRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.sm,
  },
  repeatTag: {
    backgroundColor: "#FEF3C7",
    borderRadius: 6,
    paddingHorizontal: spacingTokens.sm,
    paddingVertical: spacingTokens.xs,
  },
  repeatText: {
    color: colorTokens.accent,
    fontSize: 13,
    fontWeight: "800",
  },
  rubricHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rubricLabel: {
    color: colorTokens.text,
    fontSize: 14,
    fontWeight: "700",
  },
  rubricList: {
    gap: spacingTokens.md,
  },
  rubricRow: {
    gap: spacingTokens.xs,
  },
  rubricScore: {
    color: colorTokens.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  score: {
    color: colorTokens.primary,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 39,
  },
  scoreBlock: {
    alignItems: "center",
    borderRightColor: colorTokens.border,
    borderRightWidth: 1,
    minWidth: 112,
    paddingRight: spacingTokens.md,
  },
  scoreCopy: {
    flex: 1,
    gap: spacingTokens.xs,
  },
  scoreLabel: {
    color: colorTokens.mutedText,
    fontSize: 12,
    fontWeight: "700",
  },
  scoreRow: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.md,
    padding: spacingTokens.md,
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
  sectionTitle: {
    color: colorTokens.text,
    fontSize: 17,
    fontWeight: "800",
  },
  severity: {
    color: colorTokens.danger,
    fontSize: 12,
    fontWeight: "800",
  },
  wrapper: {
    gap: spacingTokens.lg,
  },
});
