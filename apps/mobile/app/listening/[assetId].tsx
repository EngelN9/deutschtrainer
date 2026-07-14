import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2, Circle, Eye, Headphones, Lightbulb, RefreshCw } from "lucide-react-native";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import type { SubmitDictationResponse } from "@deutschtrainer/validation";
import { AuthGate } from "../../src/features/auth/AuthGate";
import { ContentScreen } from "../../src/components/ContentScreen";
import { MessageBanner } from "../../src/components/MessageBanner";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { StatePanel } from "../../src/components/StatePanel";
import { AudioPlayerControls } from "../../src/features/audio-learning/AudioPlayerControls";
import { listeningKindLabel } from "../../src/features/audio-learning/audioLabels";
import {
  useAudioLearningWorkspace,
  useListeningAudio,
  useRecordListeningActivity,
  useRevealListeningTranscript,
  useSubmitListeningDictation,
} from "../../src/features/audio-learning/useAudioLearning";
import { WordComparisonView } from "../../src/features/audio-learning/WordComparisonView";

export default function ListeningPracticeScreen() {
  const { assetId } = useLocalSearchParams<{ assetId?: string }>();
  const router = useRouter();
  const workspaceQuery = useAudioLearningWorkspace();
  const audioMutation = useListeningAudio();
  const activityMutation = useRecordListeningActivity();
  const revealMutation = useRevealListeningTranscript();
  const submitMutation = useSubmitListeningDictation();
  const [sessionKey] = useState(() => createKey("listening-session"));
  const [idempotencyKey] = useState(() => createKey("listening-submit"));
  const [audioUri, setAudioUri] = useState<string>();
  const [playCount, setPlayCount] = useState(0);
  const [usedSlowSpeed, setUsedSlowSpeed] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [dictationText, setDictationText] = useState("");
  const [answer, setAnswer] = useState<string>();
  const [transcript, setTranscript] = useState<string>();
  const [result, setResult] = useState<SubmitDictationResponse>();
  const asset = useMemo(
    () => workspaceQuery.data?.listeningAssets.find((entry) => entry.id === assetId),
    [assetId, workspaceQuery.data],
  );
  const errorMessage =
    audioMutation.error?.message ??
    activityMutation.error?.message ??
    revealMutation.error?.message ??
    submitMutation.error?.message ??
    null;

  const loadAudio = async () => {
    if (!asset) return;
    const response = await audioMutation.mutateAsync({
      listeningAssetId: asset.id,
      voice: asset.ttsVoice,
      idempotencyKey: createKey("tts"),
    });
    setAudioUri(response.signedUrl);
  };

  const recordPlay = (slow: boolean) => {
    if (!asset) return;
    setPlayCount((current) => current + 1);
    setUsedSlowSpeed((current) => current || slow);
    activityMutation.mutate({
      listeningAssetId: asset.id,
      sessionKey,
      playIncrement: 1,
      usedSlowSpeed: slow,
      transcriptViewed: false,
    });
  };

  const revealTranscript = async () => {
    if (!asset) return;
    const response = await revealMutation.mutateAsync({
      listeningAssetId: asset.id,
      sessionKey,
      playIncrement: 0,
      usedSlowSpeed,
    });
    setTranscript(response.transcriptDe);
  };

  const submit = async () => {
    if (!asset || !answer) return;
    const response = await submitMutation.mutateAsync({
      listeningAssetId: asset.id,
      sessionKey,
      textDe: dictationText,
      comprehensionAnswer: answer,
      playCount,
      usedSlowSpeed,
      idempotencyKey,
    });
    setResult(response);
    setTranscript(response.transcriptDe);
  };

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description={asset?.descriptionZhTw}
        eyebrow={asset ? `${asset.level} · ${listeningKindLabel(asset.kind)}` : "聽力訓練"}
        showBack
        title={asset?.titleZhTw ?? "聽力練習"}
      >
        {workspaceQuery.isLoading ? (
          <StatePanel message="正在載入聽力素材..." state="loading" title="準備練習" />
        ) : workspaceQuery.isError ? (
          <StatePanel
            message={workspaceQuery.error.message}
            onRetry={() => void workspaceQuery.refetch()}
            state="error"
            title="無法載入聽力素材"
          />
        ) : !asset ? (
          <StatePanel message="這份聽力素材不存在或尚未發布。" state="empty" title="找不到素材" />
        ) : (
          <>
            <MessageBanner message={errorMessage} tone="error" />
            <View style={styles.section}>
              <View style={styles.headingRow}>
                <Headphones color={colorTokens.primary} size={20} />
                <Text style={styles.sectionTitle}>音訊</Text>
                <Text style={styles.counter}>已播放 {playCount} 次</Text>
              </View>
              <AudioPlayerControls onPlay={recordPlay} sourceUri={audioUri} />
              <PrimaryButton
                accessibilityLabel={audioUri ? "重新取得音訊" : "取得練習音訊"}
                loading={audioMutation.isPending}
                onPress={() => void loadAudio()}
                variant={audioUri ? "secondary" : "primary"}
              >
                {audioUri ? "重新取得音訊" : "取得練習音訊"}
              </PrimaryButton>
            </View>

            <View style={styles.section}>
              <View style={styles.actionRow}>
                <Pressable
                  accessibilityLabel={showHints ? "隱藏關鍵詞" : "顯示關鍵詞"}
                  accessibilityRole="button"
                  onPress={() => setShowHints((current) => !current)}
                  style={({ pressed }) => [styles.actionButton, pressed ? styles.pressed : null]}
                >
                  <Lightbulb color={colorTokens.accent} size={18} />
                  <Text style={styles.actionText}>{showHints ? "隱藏提示" : "關鍵詞提示"}</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="顯示德語逐字稿"
                  accessibilityRole="button"
                  disabled={revealMutation.isPending || Boolean(transcript)}
                  onPress={() => void revealTranscript()}
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed ? styles.pressed : null,
                    transcript ? styles.disabled : null,
                  ]}
                >
                  <Eye color={colorTokens.teal} size={18} />
                  <Text style={styles.actionText}>逐字稿</Text>
                </Pressable>
              </View>
              {showHints ? (
                <View style={styles.hints}>
                  {asset.keywordHints.map((hint) => (
                    <Text key={hint} style={styles.hint}>
                      {hint}
                    </Text>
                  ))}
                </View>
              ) : null}
              {transcript ? (
                <View style={styles.transcript}>
                  <Text style={styles.transcriptLabel}>逐字稿</Text>
                  <Text style={styles.transcriptText}>{transcript}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>聽寫</Text>
              <TextInput
                accessibilityLabel="輸入你聽到的德語"
                editable={!result}
                multiline
                onChangeText={setDictationText}
                placeholder="Schreibe hier, was du hörst ..."
                placeholderTextColor="#7C8798"
                style={styles.input}
                textAlignVertical="top"
                value={dictationText}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.question}>{asset.comprehensionQuestionZhTw}</Text>
              <View accessibilityRole="radiogroup" style={styles.options}>
                {asset.comprehensionOptions.map((option) => {
                  const selected = answer === option.key;
                  return (
                    <Pressable
                      accessibilityLabel={option.textZhTw}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      disabled={Boolean(result)}
                      key={option.key}
                      onPress={() => setAnswer(option.key)}
                      style={({ pressed }) => [
                        styles.option,
                        selected ? styles.optionSelected : null,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      {selected ? (
                        <CheckCircle2 color={colorTokens.primary} size={20} />
                      ) : (
                        <Circle color={colorTokens.mutedText} size={20} />
                      )}
                      <Text style={styles.optionText}>{option.textZhTw}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {!result ? (
                <PrimaryButton
                  accessibilityLabel="送出聽寫答案"
                  disabled={!dictationText.trim() || !answer}
                  loading={submitMutation.isPending}
                  onPress={() => void submit()}
                >
                  送出答案
                </PrimaryButton>
              ) : null}
            </View>

            {result ? (
              <View style={styles.resultSection}>
                <View style={styles.scoreRow}>
                  <View>
                    <Text style={styles.scoreLabel}>聽寫吻合度</Text>
                    <Text style={styles.score}>{result.score}</Text>
                  </View>
                  <Text
                    style={[
                      styles.comprehension,
                      result.comprehensionCorrect ? styles.correct : styles.incorrect,
                    ]}
                  >
                    理解題{result.comprehensionCorrect ? "答對" : "需再確認"}
                  </Text>
                </View>
                <WordComparisonView changes={result.comparison} />
                <View style={styles.legend}>
                  <Text style={styles.legendText}>黃色底線：漏聽</Text>
                  <Text style={styles.legendText}>紅色刪線：多寫</Text>
                </View>
                {result.difficultWords.length > 0 ? (
                  <Text style={styles.difficult}>建議複習：{result.difficultWords.join("、")}</Text>
                ) : null}
                <Pressable
                  accessibilityLabel="返回並選擇下一份聽力練習"
                  accessibilityRole="button"
                  onPress={() => router.back()}
                  style={({ pressed }) => [styles.nextButton, pressed ? styles.pressed : null]}
                >
                  <RefreshCw color={colorTokens.primary} size={18} />
                  <Text style={styles.nextText}>選擇下一份練習</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </ContentScreen>
    </AuthGate>
  );
}

function createKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.sm,
    minHeight: 44,
    paddingHorizontal: spacingTokens.md,
  },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacingTokens.sm },
  actionText: { color: colorTokens.text, fontSize: 14, fontWeight: "700" },
  comprehension: { borderRadius: 4, fontSize: 13, fontWeight: "800", padding: spacingTokens.sm },
  correct: { backgroundColor: "#EAF7F2", color: colorTokens.success },
  counter: { color: colorTokens.mutedText, fontSize: 13, marginLeft: "auto" },
  difficult: { color: colorTokens.accent, fontSize: 14, fontWeight: "700", lineHeight: 21 },
  disabled: { opacity: 0.5 },
  headingRow: { alignItems: "center", flexDirection: "row", gap: spacingTokens.sm },
  hint: {
    backgroundColor: "#FFF7D6",
    borderRadius: 4,
    color: "#7A4D00",
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: spacingTokens.sm,
    paddingVertical: spacingTokens.xs,
  },
  hints: { flexDirection: "row", flexWrap: "wrap", gap: spacingTokens.sm },
  incorrect: { backgroundColor: "#FFF1F2", color: colorTokens.danger },
  input: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colorTokens.text,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 140,
    padding: spacingTokens.md,
  },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacingTokens.md },
  legendText: { color: colorTokens.mutedText, fontSize: 12 },
  nextButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacingTokens.sm,
    minHeight: 44,
  },
  nextText: { color: colorTokens.primary, fontSize: 14, fontWeight: "800" },
  option: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.sm,
    minHeight: 50,
    padding: spacingTokens.md,
  },
  optionSelected: { backgroundColor: "#EFF6FF", borderColor: colorTokens.primary },
  optionText: { color: colorTokens.text, flex: 1, fontSize: 14, lineHeight: 21 },
  options: { gap: spacingTokens.sm },
  pressed: { opacity: 0.72 },
  question: { color: colorTokens.text, fontSize: 16, fontWeight: "800", lineHeight: 24 },
  resultSection: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacingTokens.md,
    padding: spacingTokens.lg,
  },
  score: { color: colorTokens.primary, fontSize: 38, fontWeight: "800", lineHeight: 44 },
  scoreLabel: { color: colorTokens.mutedText, fontSize: 13, fontWeight: "700" },
  scoreRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  section: {
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
    gap: spacingTokens.md,
    paddingTop: spacingTokens.lg,
  },
  sectionTitle: { color: colorTokens.text, fontSize: 17, fontWeight: "800" },
  transcript: {
    backgroundColor: "#F0FDFA",
    borderLeftColor: colorTokens.teal,
    borderLeftWidth: 3,
    gap: spacingTokens.xs,
    padding: spacingTokens.md,
  },
  transcriptLabel: { color: colorTokens.teal, fontSize: 12, fontWeight: "800" },
  transcriptText: { color: colorTokens.text, fontSize: 16, lineHeight: 25 },
});
