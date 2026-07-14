import { useMemo, useState } from "react";
import type { CefrLevel } from "@deutschtrainer/shared-types";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { ChevronRight, Clock3, Headphones, Mic2, RotateCcw, Trash2 } from "lucide-react-native";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../src/features/auth/AuthGate";
import { ContentScreen } from "../src/components/ContentScreen";
import { IconButton } from "../src/components/IconButton";
import { LevelSelector } from "../src/components/LevelSelector";
import { MainNavigation } from "../src/components/MainNavigation";
import { MessageBanner } from "../src/components/MessageBanner";
import { StatePanel } from "../src/components/StatePanel";
import { listeningKindLabel } from "../src/features/audio-learning/audioLabels";
import {
  useAudioLearningWorkspace,
  useDeleteSpeakingSubmission,
} from "../src/features/audio-learning/useAudioLearning";

export default function AudioTrainingScreen() {
  const router = useRouter();
  const [level, setLevel] = useState<CefrLevel>("B1");
  const workspaceQuery = useAudioLearningWorkspace();
  const deleteMutation = useDeleteSpeakingSubmission();
  const listeningAssets = useMemo(
    () => workspaceQuery.data?.listeningAssets.filter((asset) => asset.level === level) ?? [],
    [level, workspaceQuery.data],
  );
  const speakingPrompts = useMemo(
    () => workspaceQuery.data?.speakingPrompts.filter((prompt) => prompt.level === level) ?? [],
    [level, workspaceQuery.data],
  );
  const submissions = workspaceQuery.data?.speakingSubmissions ?? [];

  const confirmDelete = (submissionId: string) => {
    Alert.alert("刪除錄音", "這會永久刪除私人錄音與轉錄回饋。", [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: () => deleteMutation.mutate(submissionId),
      },
    ]);
  };

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description="從聽懂、聽寫到朗讀重錄，逐步建立可實際使用的德語。"
        eyebrow="聽力與口說"
        title="把輸入轉成輸出"
      >
        <LevelSelector onChange={setLevel} value={level} />
        <MessageBanner
          message={deleteMutation.isError ? deleteMutation.error.message : null}
          tone="error"
        />
        {workspaceQuery.isLoading ? (
          <StatePanel
            message="正在同步聽力素材與口說紀錄..."
            state="loading"
            title="載入聽說資料"
          />
        ) : workspaceQuery.isError ? (
          <StatePanel
            message={workspaceQuery.error.message}
            onRetry={() => void workspaceQuery.refetch()}
            state="error"
            title="無法載入聽說資料"
          />
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <Headphones color={colorTokens.primary} size={20} />
                <Text style={styles.sectionTitle}>{level} 聽力訓練</Text>
              </View>
              <View style={styles.list}>
                {listeningAssets.map((asset) => {
                  const latest = workspaceQuery.data?.listeningAttempts.find(
                    (attempt) => attempt.listeningAssetId === asset.id,
                  );
                  return (
                    <Pressable
                      accessibilityLabel={`開始 ${asset.titleZhTw}`}
                      accessibilityRole="button"
                      key={asset.id}
                      onPress={() =>
                        router.push({
                          pathname: "/listening/[assetId]",
                          params: { assetId: asset.id },
                        } as unknown as Href)
                      }
                      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
                    >
                      <View style={styles.cardCopy}>
                        <View style={styles.metaRow}>
                          <Text style={styles.kind}>{listeningKindLabel(asset.kind)}</Text>
                          <View style={styles.inlineMeta}>
                            <Clock3 color={colorTokens.mutedText} size={14} />
                            <Text style={styles.meta}>{asset.estimatedSeconds} 秒</Text>
                          </View>
                        </View>
                        <Text style={styles.cardTitle}>{asset.titleZhTw}</Text>
                        <Text style={styles.description}>{asset.descriptionZhTw}</Text>
                        {latest?.status === "completed" ? (
                          <Text style={styles.resultText}>
                            最近聽寫 {latest.dictationScore ?? 0} 分 · 播放 {latest.playCount} 次
                          </Text>
                        ) : null}
                      </View>
                      <ChevronRight color={colorTokens.mutedText} size={21} />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <Mic2 color={colorTokens.teal} size={20} />
                <Text style={styles.sectionTitle}>{level} 口說訓練</Text>
              </View>
              <View style={styles.list}>
                {speakingPrompts.map((prompt) => (
                  <Pressable
                    accessibilityLabel={`開始 ${prompt.titleZhTw}`}
                    accessibilityRole="button"
                    key={prompt.id}
                    onPress={() =>
                      router.push({
                        pathname: "/speaking/[promptId]",
                        params: { promptId: prompt.id },
                      } as unknown as Href)
                    }
                    style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
                  >
                    <View style={styles.cardCopy}>
                      <View style={styles.metaRow}>
                        <Text style={styles.kind}>跟讀與重錄</Text>
                        <Text style={styles.meta}>上限 {prompt.maximumSeconds} 秒</Text>
                      </View>
                      <Text style={styles.cardTitle}>{prompt.titleZhTw}</Text>
                      <Text numberOfLines={3} style={styles.german}>
                        {prompt.targetDe}
                      </Text>
                    </View>
                    <ChevronRight color={colorTokens.mutedText} size={21} />
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <RotateCcw color={colorTokens.accent} size={20} />
                <Text style={styles.sectionTitle}>最近口說紀錄</Text>
              </View>
              {submissions.length > 0 ? (
                <View style={styles.history}>
                  {submissions.slice(0, 8).map((submission) => {
                    const prompt = workspaceQuery.data?.speakingPrompts.find(
                      (entry) => entry.id === submission.speakingPromptId,
                    );
                    return (
                      <View key={submission.id} style={styles.historyRow}>
                        <View style={styles.historyCopy}>
                          <Text style={styles.historyTitle}>{prompt?.titleZhTw ?? "口說練習"}</Text>
                          <Text style={styles.meta}>
                            {submission.status === "completed"
                              ? `內容 ${submission.feedback?.contentScore ?? 0} 分 · ${Math.round(submission.wordsPerMinute ?? 0)} WPM`
                              : "轉錄未完成，可刪除後重新錄製"}
                          </Text>
                        </View>
                        <IconButton
                          accessibilityLabel={`刪除 ${prompt?.titleZhTw ?? "口說"} 錄音`}
                          icon={Trash2}
                          onPress={() => confirmDelete(submission.id)}
                          tone="danger"
                        />
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyText}>完成第一次錄音後，私人紀錄會顯示在這裡。</Text>
              )}
            </View>
          </>
        )}
        <MainNavigation />
      </ContentScreen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.md,
    padding: spacingTokens.md,
  },
  cardCopy: { flex: 1, gap: spacingTokens.sm, minWidth: 0 },
  cardTitle: { color: colorTokens.text, fontSize: 17, fontWeight: "800", lineHeight: 24 },
  description: { color: colorTokens.mutedText, fontSize: 14, lineHeight: 21 },
  emptyText: { color: colorTokens.mutedText, fontSize: 14, lineHeight: 22 },
  german: { color: colorTokens.text, fontSize: 15, lineHeight: 23 },
  history: { borderTopColor: colorTokens.border, borderTopWidth: 1 },
  historyCopy: { flex: 1, gap: spacingTokens.xs, minWidth: 0 },
  historyRow: {
    alignItems: "center",
    borderBottomColor: colorTokens.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.md,
    minHeight: 72,
    paddingVertical: spacingTokens.md,
  },
  historyTitle: { color: colorTokens.text, fontSize: 15, fontWeight: "800", lineHeight: 21 },
  inlineMeta: { alignItems: "center", flexDirection: "row", gap: spacingTokens.xs },
  kind: { color: colorTokens.teal, fontSize: 12, fontWeight: "800" },
  list: { gap: spacingTokens.md },
  meta: { color: colorTokens.mutedText, fontSize: 13, lineHeight: 18 },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.sm,
    justifyContent: "space-between",
  },
  pressed: { opacity: 0.72 },
  resultText: { color: colorTokens.primary, fontSize: 13, fontWeight: "800" },
  section: {
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
    gap: spacingTokens.md,
    paddingTop: spacingTokens.lg,
  },
  sectionHeading: { alignItems: "center", flexDirection: "row", gap: spacingTokens.sm },
  sectionTitle: { color: colorTokens.text, fontSize: 17, fontWeight: "800" },
});
