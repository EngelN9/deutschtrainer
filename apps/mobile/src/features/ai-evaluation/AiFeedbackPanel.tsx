import type { AiEvaluationFeedback } from "@deutschtrainer/ai-schemas";
import { AlertTriangle, CheckCircle2, Sparkles, XCircle } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";

interface AiFeedbackPanelProps {
  cached: boolean;
  feedback: AiEvaluationFeedback;
  fallback: boolean;
}

export function AiFeedbackPanel({ cached, feedback, fallback }: AiFeedbackPanelProps) {
  return (
    <View style={[styles.panel, fallback ? styles.fallbackPanel : styles.resultPanel]}>
      <View style={styles.heading}>
        {fallback ? (
          <AlertTriangle color={colorTokens.warning} size={24} />
        ) : feedback.isCorrect ? (
          <CheckCircle2 color={colorTokens.success} size={24} />
        ) : (
          <XCircle color={colorTokens.danger} size={24} />
        )}
        <View style={styles.headingText}>
          <Text style={styles.title}>
            {fallback
              ? "批改暫時無法完成"
              : feedback.isCorrect
                ? `表現穩定 · ${feedback.score} 分`
                : `需要修正 · ${feedback.score} 分`}
          </Text>
          <Text style={styles.meta}>
            預估 {feedback.cefrLevelEstimate}
            {cached ? " · 已使用相同回答快取" : ""}
          </Text>
        </View>
      </View>

      {feedback.errors.map((error, index) => (
        <View key={`${error.type}:${index}`} style={styles.errorItem}>
          <Text style={styles.errorType}>{formatErrorType(error.type)}</Text>
          <Text selectable style={styles.original}>
            {error.original}
          </Text>
          <Text selectable style={styles.correction}>
            {error.correction}
          </Text>
          <Text style={styles.explanation}>{error.explanationZhTw}</Text>
        </View>
      ))}

      {!fallback ? (
        <>
          <FeedbackSection label="修正版" values={[feedback.correctedText]} />
          <FeedbackSection label="自然說法" values={[feedback.naturalAlternative]} />
          <FeedbackSection label="做得好的地方" values={feedback.strengths} />
          <FeedbackSection label="下一步" values={feedback.suggestions} />
        </>
      ) : null}

      {feedback.requiresHumanReview && !fallback ? (
        <View style={styles.reviewNotice}>
          <Sparkles color={colorTokens.teal} size={17} />
          <Text style={styles.reviewNoticeText}>這份回饋信心較低，建議保留原文並再次確認。</Text>
        </View>
      ) : null}
      <Text style={styles.disclaimer}>AI 回饋可能有誤；重要語意與考試作答請再次核對。</Text>
    </View>
  );
}

function FeedbackSection({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) {
    return null;
  }
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {values.map((value, index) => (
        <Text key={`${label}:${index}`} selectable style={styles.sectionText}>
          {values.length > 1 ? `• ${value}` : value}
        </Text>
      ))}
    </View>
  );
}

function formatErrorType(type: string): string {
  const labels: Record<string, string> = {
    word_order: "語序",
    subordinate_clause: "從句",
    case: "格位",
    article: "冠詞",
    verb_conjugation: "動詞變化",
    word_choice: "用字",
    register: "語域",
    coherence: "連貫性",
    cohesion: "篇章銜接",
    argumentation: "論證",
    task_completion: "任務完成度",
    style: "風格",
    idiomaticity: "自然度",
  };
  return labels[type] ?? type.replaceAll("_", " ");
}

const styles = StyleSheet.create({
  correction: {
    color: colorTokens.success,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 23,
  },
  disclaimer: {
    color: colorTokens.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
  errorItem: {
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
    gap: spacingTokens.xs,
    paddingTop: spacingTokens.md,
  },
  errorType: {
    color: colorTokens.danger,
    fontSize: 13,
    fontWeight: "800",
  },
  explanation: {
    color: colorTokens.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  fallbackPanel: {
    backgroundColor: "#FFF8E6",
    borderColor: "#E6C66A",
  },
  heading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.sm,
  },
  headingText: {
    flex: 1,
    gap: 2,
  },
  meta: {
    color: colorTokens.mutedText,
    fontSize: 12,
  },
  original: {
    color: colorTokens.danger,
    fontSize: 15,
    lineHeight: 23,
    textDecorationLine: "line-through",
  },
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: spacingTokens.md,
    padding: spacingTokens.md,
  },
  resultPanel: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
  },
  reviewNotice: {
    alignItems: "flex-start",
    backgroundColor: "#EDF8F7",
    borderRadius: 6,
    flexDirection: "row",
    gap: spacingTokens.sm,
    padding: spacingTokens.sm,
  },
  reviewNoticeText: {
    color: colorTokens.teal,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  section: {
    gap: spacingTokens.xs,
  },
  sectionLabel: {
    color: colorTokens.mutedText,
    fontSize: 13,
    fontWeight: "800",
  },
  sectionText: {
    color: colorTokens.text,
    fontSize: 15,
    lineHeight: 23,
  },
  title: {
    color: colorTokens.text,
    fontSize: 17,
    fontWeight: "800",
  },
});
