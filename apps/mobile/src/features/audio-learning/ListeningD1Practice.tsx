import { useState } from "react";
import { useRouter } from "expo-router";
import { CheckCircle2, Circle, ExternalLink, Headphones, XCircle } from "lucide-react-native";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { ContentScreen } from "../../components/ContentScreen";
import { MessageBanner } from "../../components/MessageBanner";
import { PrimaryButton } from "../../components/PrimaryButton";
import { AudioPlayerControls } from "./AudioPlayerControls";
import { getListeningD1AudioSource } from "./listeningD1Audio";
import {
  gradeListeningD1Exercise,
  type ListeningD1Exercise,
  type ListeningD1GradeResult,
} from "./listeningD1";

interface ListeningD1PracticeProps {
  exercise: ListeningD1Exercise;
}

export function ListeningD1Practice({ exercise }: ListeningD1PracticeProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [playCount, setPlayCount] = useState(0);
  const [result, setResult] = useState<ListeningD1GradeResult>();
  const audioSource = getListeningD1AudioSource(exercise.id);
  const completedResult = result?.status === "completed" ? result : undefined;
  const allAnswered = exercise.questions.every((question) => Boolean(answers[question.id]));

  const submit = () => {
    setResult(gradeListeningD1Exercise(exercise, answers));
  };

  return (
    <ContentScreen
      description={exercise.descriptionZhTw}
      eyebrow={`${exercise.level} · 固定聽力 D1`}
      showBack
      title={exercise.titleZhTw}
    >
      <MessageBanner
        message={!audioSource ? "固定音檔未包含在此版本中，這份練習目前無法開始。" : null}
        tone="error"
      />
      <MessageBanner message={result?.status === "invalid" ? result.message : null} tone="error" />

      <View style={styles.contextCard}>
        <View style={styles.headingRow}>
          <Headphones color={colorTokens.primary} size={20} />
          <Text style={styles.sectionTitle}>先聽，再作答</Text>
          <Text style={styles.counter}>已播放 {playCount} 次</Text>
        </View>
        <Text style={styles.context}>{exercise.contextZhTw}</Text>
        <View style={styles.vocabularyCard}>
          <Text style={styles.vocabularyTitle}>聽前詞彙</Text>
          {exercise.vocabularySupport.map((entry) => (
            <View key={entry.termDe} style={styles.vocabularyRow}>
              <Text style={styles.vocabularyTerm}>{entry.termDe}</Text>
              <Text style={styles.vocabularyExplanation}>{entry.explanationZhTw}</Text>
            </View>
          ))}
        </View>
        <AudioPlayerControls
          onPlay={() => setPlayCount((current) => current + 1)}
          sourceUri={audioSource}
        />
        <Text style={styles.providerNote}>真人預錄固定音檔 · 本練習不使用 AI、TTS 或語音辨識</Text>
      </View>

      <View style={styles.questions}>
        {exercise.questions.map((question, questionIndex) => {
          const questionResult = completedResult?.questionResults.find(
            (entry) => entry.questionId === question.id,
          );
          return (
            <View key={question.id} style={styles.questionCard}>
              <Text style={styles.questionNumber}>第 {questionIndex + 1} 題</Text>
              <Text style={styles.question}>{question.promptZhTw}</Text>
              <View accessibilityRole="radiogroup" style={styles.options}>
                {question.options.map((option) => {
                  const selected = answers[question.id] === option.key;
                  const correct = questionResult?.correctOptionKey === option.key;
                  const incorrectSelection = Boolean(questionResult && selected && !correct);
                  return (
                    <Pressable
                      accessibilityLabel={option.textZhTw}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected, disabled: Boolean(completedResult) }}
                      disabled={Boolean(completedResult)}
                      key={option.key}
                      onPress={() =>
                        setAnswers((current) => ({ ...current, [question.id]: option.key }))
                      }
                      style={({ pressed }) => [
                        styles.option,
                        selected ? styles.optionSelected : null,
                        correct ? styles.optionCorrect : null,
                        incorrectSelection ? styles.optionIncorrect : null,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      {correct ? (
                        <CheckCircle2 color={colorTokens.success} size={21} />
                      ) : incorrectSelection ? (
                        <XCircle color={colorTokens.danger} size={21} />
                      ) : selected ? (
                        <CheckCircle2 color={colorTokens.primary} size={21} />
                      ) : (
                        <Circle color={colorTokens.mutedText} size={21} />
                      )}
                      <Text style={styles.optionText}>{option.textZhTw}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {questionResult ? (
                <Text style={questionResult.isCorrect ? styles.correctText : styles.incorrectText}>
                  {questionResult.isCorrect ? "答對。" : "這題需要再確認。"}
                  {questionResult.explanationZhTw}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      {!completedResult ? (
        <PrimaryButton
          accessibilityLabel="提交固定聽力答案"
          disabled={!audioSource || !allAnswered}
          onPress={submit}
        >
          提交答案
        </PrimaryButton>
      ) : (
        <View accessibilityLiveRegion="polite" style={styles.resultCard}>
          <Text style={styles.resultEyebrow}>本次結果</Text>
          <Text style={styles.score}>{completedResult.score} 分</Text>
          <Text style={styles.resultSummary}>
            答對 {completedResult.correctCount} / {completedResult.totalCount} 題
          </Text>
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptTitle}>逐字稿</Text>
            <Text style={styles.transcript}>{exercise.transcriptDe}</Text>
          </View>
          <PrimaryButton accessibilityLabel="返回聽力列表" onPress={() => router.back()}>
            返回聽力列表
          </PrimaryButton>
        </View>
      )}

      <View style={styles.attribution}>
        <Text style={styles.attributionText}>
          音訊：{exercise.source.title} · {exercise.source.creator} · {exercise.source.license}
        </Text>
        <Pressable
          accessibilityLabel="開啟音訊來源與授權頁"
          accessibilityRole="link"
          onPress={() => void Linking.openURL(exercise.source.pageUrl)}
          style={({ pressed }) => [styles.sourceLink, pressed ? styles.pressed : null]}
        >
          <ExternalLink color={colorTokens.primary} size={17} />
          <Text style={styles.sourceLinkText}>來源與授權</Text>
        </Pressable>
      </View>
    </ContentScreen>
  );
}

const styles = StyleSheet.create({
  attribution: {
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
    gap: spacingTokens.sm,
    paddingTop: spacingTokens.md,
  },
  attributionText: { color: colorTokens.mutedText, fontSize: 12, lineHeight: 18 },
  context: { color: colorTokens.mutedText, fontSize: 14, lineHeight: 22 },
  contextCard: { gap: spacingTokens.md },
  correctText: { color: colorTokens.success, fontSize: 14, lineHeight: 22 },
  counter: { color: colorTokens.mutedText, fontSize: 13, marginLeft: "auto" },
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.sm,
  },
  incorrectText: { color: colorTokens.danger, fontSize: 14, lineHeight: 22 },
  option: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.sm,
    minHeight: 52,
    padding: spacingTokens.md,
  },
  optionCorrect: { backgroundColor: "#EAF7F2", borderColor: colorTokens.success },
  optionIncorrect: { backgroundColor: "#FFF1F2", borderColor: colorTokens.danger },
  optionSelected: { backgroundColor: "#EFF6FF", borderColor: colorTokens.primary },
  optionText: { color: colorTokens.text, flex: 1, fontSize: 14, lineHeight: 21 },
  options: { gap: spacingTokens.sm },
  pressed: { opacity: 0.72 },
  providerNote: { color: colorTokens.teal, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  question: { color: colorTokens.text, fontSize: 16, fontWeight: "800", lineHeight: 24 },
  questionCard: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacingTokens.md,
    padding: spacingTokens.md,
  },
  questionNumber: { color: colorTokens.teal, fontSize: 12, fontWeight: "800" },
  questions: { gap: spacingTokens.md },
  resultCard: {
    backgroundColor: "#EFF6FF",
    borderColor: colorTokens.primary,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacingTokens.md,
    padding: spacingTokens.lg,
  },
  resultEyebrow: { color: colorTokens.primary, fontSize: 13, fontWeight: "800" },
  resultSummary: { color: colorTokens.text, fontSize: 16, fontWeight: "700" },
  score: { color: colorTokens.primary, fontSize: 40, fontWeight: "800", lineHeight: 46 },
  sectionTitle: { color: colorTokens.text, fontSize: 17, fontWeight: "800" },
  sourceLink: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacingTokens.sm,
    minHeight: 44,
  },
  sourceLinkText: { color: colorTokens.primary, fontSize: 14, fontWeight: "800" },
  transcript: { color: colorTokens.text, fontSize: 15, lineHeight: 24 },
  transcriptCard: {
    backgroundColor: colorTokens.surface,
    borderLeftColor: colorTokens.teal,
    borderLeftWidth: 3,
    gap: spacingTokens.sm,
    padding: spacingTokens.md,
  },
  transcriptTitle: { color: colorTokens.teal, fontSize: 13, fontWeight: "800" },
  vocabularyCard: {
    backgroundColor: "#F8FAFC",
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacingTokens.sm,
    padding: spacingTokens.md,
  },
  vocabularyExplanation: { color: colorTokens.mutedText, flex: 1, fontSize: 14, lineHeight: 21 },
  vocabularyRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.sm,
  },
  vocabularyTerm: { color: colorTokens.text, fontSize: 14, fontWeight: "800", minWidth: 150 },
  vocabularyTitle: { color: colorTokens.teal, fontSize: 13, fontWeight: "800" },
});
