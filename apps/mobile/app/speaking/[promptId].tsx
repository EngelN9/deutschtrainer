import { useEffect, useMemo, useState } from "react";
import { File } from "expo-file-system";
import {
  getRecordingPermissionsAsync,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useLocalSearchParams } from "expo-router";
import {
  CheckCircle2,
  Circle,
  CloudUpload,
  Mic2,
  Settings,
  Square,
  Trash2,
} from "lucide-react-native";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import type { TranscribeResponse } from "@deutschtrainer/validation";
import { AuthGate } from "../../src/features/auth/AuthGate";
import { ContentScreen } from "../../src/components/ContentScreen";
import { MessageBanner } from "../../src/components/MessageBanner";
import { StatePanel } from "../../src/components/StatePanel";
import { AudioPlayerControls } from "../../src/features/audio-learning/AudioPlayerControls";
import { formatAudioTime } from "../../src/features/audio-learning/audioLabels";
import {
  deleteUploadedRecording,
  uploadSpeakingRecording,
} from "../../src/features/audio-learning/audioLearningRepository";
import {
  useAudioLearningWorkspace,
  useDeleteSpeakingSubmission,
  useTranscribeSpeakingRecording,
} from "../../src/features/audio-learning/useAudioLearning";
import { WordComparisonView } from "../../src/features/audio-learning/WordComparisonView";

type PermissionState = "unknown" | "granted" | "denied";

export default function SpeakingPracticeScreen() {
  const { promptId } = useLocalSearchParams<{ promptId?: string }>();
  const workspaceQuery = useAudioLearningWorkspace();
  const transcribeMutation = useTranscribeSpeakingRecording();
  const deleteMutation = useDeleteSpeakingSubmission();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [permission, setPermission] = useState<PermissionState>("unknown");
  const [recordingStarted, setRecordingStarted] = useState(false);
  const [recorded, setRecorded] = useState<{ uri: string; durationMs: number }>();
  const [result, setResult] = useState<TranscribeResponse>();
  const [localError, setLocalError] = useState<string | null>(null);
  const [manualChecks, setManualChecks] = useState<boolean[]>([false, false, false]);
  const prompt = useMemo(
    () => workspaceQuery.data?.speakingPrompts.find((entry) => entry.id === promptId),
    [promptId, workspaceQuery.data],
  );

  useEffect(() => {
    void getRecordingPermissionsAsync().then((response) => {
      setPermission(
        response.granted ? "granted" : response.status === "denied" ? "denied" : "unknown",
      );
    });
  }, []);

  useEffect(() => {
    if (
      recordingStarted &&
      !recorderState.isRecording &&
      recorderState.url &&
      recorderState.durationMillis >= 500
    ) {
      setRecorded({ uri: recorderState.url, durationMs: recorderState.durationMillis });
      setRecordingStarted(false);
      void setAudioModeAsync({ allowsRecording: false });
    }
  }, [
    recorderState.durationMillis,
    recorderState.isRecording,
    recorderState.url,
    recordingStarted,
  ]);

  const startRecording = async () => {
    if (!prompt) return;
    setLocalError(null);
    setResult(undefined);
    const response = await requestRecordingPermissionsAsync();
    if (!response.granted) {
      setPermission("denied");
      return;
    }
    setPermission("granted");
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: prompt.maximumSeconds });
      setRecordingStarted(true);
      setRecorded(undefined);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "無法開始錄音。");
    }
  };

  const stopRecording = async () => {
    try {
      const durationMs = recorderState.durationMillis;
      await recorder.stop();
      const uri = recorder.uri ?? recorderState.url;
      if (!uri || durationMs < 500) {
        setLocalError("錄音太短，請至少朗讀半秒後再停止。");
        return;
      }
      setRecorded({ uri, durationMs });
      setRecordingStarted(false);
      await setAudioModeAsync({ allowsRecording: false });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "無法停止錄音。");
    }
  };

  const removeLocalRecording = () => {
    if (!recorded) return;
    try {
      if (Platform.OS === "web" && recorded.uri.startsWith("blob:")) {
        URL.revokeObjectURL(recorded.uri);
      } else if (Platform.OS !== "web") {
        const file = new File(recorded.uri);
        if (file.exists) file.delete();
      }
    } catch {
      // The OS may already have removed a cache recording.
    }
    setRecorded(undefined);
    setResult(undefined);
    setLocalError(null);
  };

  const submitRecording = async () => {
    if (!prompt || !recorded) return;
    setLocalError(null);
    const idempotencyKey = createKey("speaking-submit");
    const mimeType = Platform.OS === "web" ? "audio/webm" : "audio/mp4";
    let storagePath: string | undefined;
    try {
      storagePath = await uploadSpeakingRecording({
        uri: recorded.uri,
        mimeType,
        idempotencyKey,
      });
      const response = await transcribeMutation.mutateAsync({
        speakingPromptId: prompt.id,
        storagePath,
        mimeType,
        durationMs: recorded.durationMs,
        idempotencyKey,
      });
      setResult(response);
    } catch (error) {
      if (storagePath) {
        await deleteUploadedRecording(storagePath).catch(() => undefined);
      }
      setLocalError(error instanceof Error ? error.message : "無法提交錄音。");
    }
  };

  const deleteSavedRecording = async () => {
    if (!result) return;
    try {
      await deleteMutation.mutateAsync(result.submissionId);
      removeLocalRecording();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "無法刪除錄音。");
    }
  };

  const errorMessage =
    localError ?? transcribeMutation.error?.message ?? deleteMutation.error?.message ?? null;

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description={prompt?.instructionZhTw}
        eyebrow={prompt ? `${prompt.level} · 口說訓練` : "口說訓練"}
        showBack
        title={prompt?.titleZhTw ?? "口說練習"}
      >
        {workspaceQuery.isLoading ? (
          <StatePanel message="正在載入口說題目..." state="loading" title="準備錄音" />
        ) : workspaceQuery.isError ? (
          <StatePanel
            message={workspaceQuery.error.message}
            onRetry={() => void workspaceQuery.refetch()}
            state="error"
            title="無法載入口說題目"
          />
        ) : !prompt ? (
          <StatePanel message="這份口說題目不存在或尚未發布。" state="empty" title="找不到題目" />
        ) : (
          <>
            <MessageBanner message={errorMessage} tone="error" />
            <View style={styles.targetSection}>
              <Text style={styles.targetLabel}>目標句</Text>
              <Text style={styles.target}>{prompt.targetDe}</Text>
              <Text style={styles.translation}>{prompt.translationZhTw}</Text>
            </View>

            {permission === "denied" ? (
              <ManualPractice
                checks={manualChecks}
                onChange={setManualChecks}
                onOpenSettings={() => void Linking.openSettings()}
              />
            ) : (
              <View style={styles.section}>
                <View style={styles.recordingHeader}>
                  <Mic2
                    color={recorderState.isRecording ? colorTokens.danger : colorTokens.primary}
                    size={20}
                  />
                  <Text style={styles.sectionTitle}>
                    {recorderState.isRecording ? "錄音中" : recorded ? "錄音完成" : "準備錄音"}
                  </Text>
                  <Text style={styles.timer}>
                    {formatAudioTime(
                      recorderState.isRecording
                        ? recorderState.durationMillis / 1000
                        : (recorded?.durationMs ?? 0) / 1000,
                    )}
                    {` / ${formatAudioTime(prompt.maximumSeconds)}`}
                  </Text>
                </View>
                <View style={styles.meterTrack}>
                  <View
                    style={[
                      styles.meterFill,
                      {
                        width: `${Math.min(100, ((recorderState.isRecording ? recorderState.durationMillis : (recorded?.durationMs ?? 0)) / (prompt.maximumSeconds * 1000)) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                {recorderState.isRecording ? (
                  <CommandButton
                    icon={Square}
                    label="停止錄音"
                    onPress={() => void stopRecording()}
                    tone="danger"
                  />
                ) : (
                  <CommandButton
                    icon={Mic2}
                    label={recorded ? "重新錄製" : "開始錄音"}
                    onPress={() => void startRecording()}
                  />
                )}
              </View>
            )}

            {recorded ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>錄音預聽</Text>
                <AudioPlayerControls sourceUri={recorded.uri} />
                {!result ? (
                  <View style={styles.commandRow}>
                    <CommandButton
                      disabled={transcribeMutation.isPending}
                      icon={CloudUpload}
                      label={transcribeMutation.isPending ? "正在分析" : "上傳並分析"}
                      onPress={() => void submitRecording()}
                    />
                    <CommandButton
                      icon={Trash2}
                      label="刪除本機錄音"
                      onPress={removeLocalRecording}
                      tone="secondary"
                    />
                  </View>
                ) : null}
              </View>
            ) : null}

            {result?.status === "fallback" ? (
              <View style={styles.fallback}>
                <Text style={styles.fallbackTitle}>這次無法完成轉錄</Text>
                <Text style={styles.fallbackText}>
                  私人錄音已保存。你可以刪除後重新錄製；目前不會產生發音分數。
                </Text>
                <CommandButton
                  disabled={deleteMutation.isPending}
                  icon={Trash2}
                  label="刪除這次錄音"
                  onPress={() => void deleteSavedRecording()}
                  tone="danger"
                />
              </View>
            ) : result?.feedback ? (
              <View style={styles.feedbackSection}>
                <Text style={styles.sectionTitle}>轉錄輔助回饋</Text>
                <View style={styles.scores}>
                  <ScoreBox label="內容" value={result.feedback.contentScore} />
                  <ScoreBox label="文句吻合" value={result.feedback.grammarScore} />
                  <ScoreBox label="流暢度" value={result.feedback.fluencyScore} />
                  <ScoreBox label="可辨識度" value={result.feedback.intelligibilityScore} />
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>語速</Text>
                  <Text style={styles.statValue}>
                    {Math.round(result.feedback.wordsPerMinute)} WPM ·{" "}
                    {paceLabel(result.feedback.paceBand)}
                  </Text>
                </View>
                <View style={styles.feedbackBlock}>
                  <Text style={styles.blockLabel}>辨識文字</Text>
                  <Text style={styles.transcript}>{result.transcriptDe}</Text>
                </View>
                <WordComparisonView changes={result.comparison} />
                {result.feedback.pauses.length > 0 ? (
                  <View style={styles.feedbackBlock}>
                    <Text style={styles.blockLabel}>較長停頓</Text>
                    <Text style={styles.feedbackText}>
                      {result.feedback.pauses
                        .slice(0, 6)
                        .map(
                          (pause) =>
                            `${pause.afterWord} 後 ${Math.round(pause.durationMs / 100) / 10} 秒`,
                        )
                        .join("；")}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.feedbackBlock}>
                  <Text style={styles.blockLabel}>下一次重錄</Text>
                  {result.feedback.retryAdviceZhTw.map((advice) => (
                    <Text key={advice} style={styles.feedbackText}>
                      · {advice}
                    </Text>
                  ))}
                </View>
                <MessageBanner message={result.feedback.disclaimerZhTw} tone="info" />
                <CommandButton
                  disabled={deleteMutation.isPending}
                  icon={Trash2}
                  label="刪除錄音與回饋"
                  onPress={() => void deleteSavedRecording()}
                  tone="danger"
                />
              </View>
            ) : null}
          </>
        )}
      </ContentScreen>
    </AuthGate>
  );
}

function ManualPractice({
  checks,
  onChange,
  onOpenSettings,
}: {
  checks: boolean[];
  onChange: (checks: boolean[]) => void;
  onOpenSettings: () => void;
}) {
  const labels = ["先默讀並標出重音", "分成語意段落朗讀", "對照目標句自行重讀一次"];
  return (
    <View style={styles.permissionPanel}>
      <Text style={styles.permissionTitle}>麥克風權限未開啟</Text>
      <Text style={styles.permissionText}>你仍可完成不錄音的朗讀自評，或到系統設定開啟權限。</Text>
      <View style={styles.checkList}>
        {labels.map((label, index) => (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: checks[index] }}
            key={label}
            onPress={() =>
              onChange(checks.map((value, entry) => (entry === index ? !value : value)))
            }
            style={({ pressed }) => [styles.checkRow, pressed ? styles.pressed : null]}
          >
            {checks[index] ? (
              <CheckCircle2 color={colorTokens.success} size={20} />
            ) : (
              <Circle color={colorTokens.mutedText} size={20} />
            )}
            <Text style={styles.checkLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <CommandButton
        icon={Settings}
        label="開啟系統設定"
        onPress={onOpenSettings}
        tone="secondary"
      />
    </View>
  );
}

function CommandButton({
  disabled = false,
  icon: Icon,
  label,
  onPress,
  tone = "primary",
}: {
  disabled?: boolean;
  icon: typeof Mic2;
  label: string;
  onPress: () => void;
  tone?: "primary" | "secondary" | "danger";
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.commandButton,
        tone === "primary" ? styles.commandPrimary : null,
        tone === "secondary" ? styles.commandSecondary : null,
        tone === "danger" ? styles.commandDanger : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Icon color={tone === "secondary" ? colorTokens.text : "#FFFFFF"} size={19} />
      <Text style={[styles.commandText, tone === "secondary" ? styles.commandTextSecondary : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ScoreBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.scoreBox}>
      <Text style={styles.scoreValue}>{value}</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

function paceLabel(value: "slow" | "balanced" | "fast"): string {
  return value === "slow" ? "偏慢" : value === "fast" ? "偏快" : "適中";
}

function createKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

const styles = StyleSheet.create({
  blockLabel: { color: colorTokens.teal, fontSize: 13, fontWeight: "800" },
  checkLabel: { color: colorTokens.text, flex: 1, fontSize: 14, lineHeight: 21 },
  checkList: { gap: spacingTokens.sm },
  checkRow: { alignItems: "center", flexDirection: "row", gap: spacingTokens.sm, minHeight: 36 },
  commandButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacingTokens.md,
  },
  commandDanger: { backgroundColor: colorTokens.danger, borderColor: colorTokens.danger },
  commandPrimary: { backgroundColor: colorTokens.primary, borderColor: colorTokens.primary },
  commandRow: { flexDirection: "row", flexWrap: "wrap", gap: spacingTokens.sm },
  commandSecondary: { backgroundColor: colorTokens.surface, borderColor: colorTokens.border },
  commandText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  commandTextSecondary: { color: colorTokens.text },
  disabled: { opacity: 0.5 },
  fallback: {
    backgroundColor: "#FFF7D6",
    borderColor: "#E7C66B",
    borderRadius: 8,
    borderWidth: 1,
    gap: spacingTokens.md,
    padding: spacingTokens.lg,
  },
  fallbackText: { color: colorTokens.mutedText, fontSize: 14, lineHeight: 22 },
  fallbackTitle: { color: colorTokens.text, fontSize: 17, fontWeight: "800" },
  feedbackBlock: { gap: spacingTokens.sm },
  feedbackSection: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacingTokens.lg,
    padding: spacingTokens.lg,
  },
  feedbackText: { color: colorTokens.mutedText, fontSize: 14, lineHeight: 22 },
  meterFill: { backgroundColor: colorTokens.primary, height: "100%" },
  meterTrack: {
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    height: 8,
    overflow: "hidden",
  },
  permissionPanel: {
    backgroundColor: "#FFF7D6",
    borderColor: "#E7C66B",
    borderRadius: 8,
    borderWidth: 1,
    gap: spacingTokens.md,
    padding: spacingTokens.lg,
  },
  permissionText: { color: colorTokens.mutedText, fontSize: 14, lineHeight: 22 },
  permissionTitle: { color: colorTokens.text, fontSize: 17, fontWeight: "800" },
  pressed: { opacity: 0.72 },
  recordingHeader: { alignItems: "center", flexDirection: "row", gap: spacingTokens.sm },
  scoreBox: {
    alignItems: "center",
    backgroundColor: colorTokens.subtle,
    borderRadius: 8,
    flexBasis: "46%",
    flexGrow: 1,
    minHeight: 88,
    justifyContent: "center",
    padding: spacingTokens.sm,
  },
  scoreLabel: {
    color: colorTokens.mutedText,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  scoreValue: { color: colorTokens.primary, fontSize: 28, fontWeight: "800", lineHeight: 34 },
  scores: { flexDirection: "row", flexWrap: "wrap", gap: spacingTokens.sm },
  section: {
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
    gap: spacingTokens.md,
    paddingTop: spacingTokens.lg,
  },
  sectionTitle: { color: colorTokens.text, fontSize: 17, fontWeight: "800" },
  statLabel: { color: colorTokens.mutedText, fontSize: 14 },
  statRow: { flexDirection: "row", justifyContent: "space-between" },
  statValue: { color: colorTokens.text, fontSize: 14, fontWeight: "800" },
  target: { color: colorTokens.text, fontSize: 19, fontWeight: "700", lineHeight: 29 },
  targetLabel: { color: colorTokens.teal, fontSize: 12, fontWeight: "800" },
  targetSection: {
    backgroundColor: colorTokens.surface,
    borderLeftColor: colorTokens.teal,
    borderLeftWidth: 3,
    gap: spacingTokens.sm,
    padding: spacingTokens.lg,
  },
  timer: {
    color: colorTokens.mutedText,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    marginLeft: "auto",
  },
  transcript: { color: colorTokens.text, fontSize: 15, lineHeight: 24 },
  translation: { color: colorTokens.mutedText, fontSize: 14, lineHeight: 22 },
});
