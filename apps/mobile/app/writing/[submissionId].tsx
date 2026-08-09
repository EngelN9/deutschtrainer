import { useEffect, useMemo, useState } from "react";
import type { WritingVersionData } from "@deutschtrainer/validation";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../../src/features/auth/AuthGate";
import { ContentScreen } from "../../src/components/ContentScreen";
import { IconButton } from "../../src/components/IconButton";
import { MessageBanner } from "../../src/components/MessageBanner";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { StatePanel } from "../../src/components/StatePanel";
import { WritingDiffView } from "../../src/features/writing/WritingDiffView";
import { WritingFeedbackPanel } from "../../src/features/writing/WritingFeedbackPanel";
import { getWritingImprovementSummary } from "../../src/features/writing/writingJourney";
import {
  useDeleteWritingSubmission,
  useSubmitWriting,
  useWritingWorkspace,
} from "../../src/features/writing/useWritingWorkspace";
import {
  errorTypeLabel,
  writingStatusLabel,
  writingTypeLabel,
} from "../../src/features/writing/writingLabels";

export default function WritingSubmissionScreen() {
  const router = useRouter();
  const { submissionId } = useLocalSearchParams<{ submissionId: string }>();
  const workspaceQuery = useWritingWorkspace();
  const deleteMutation = useDeleteWritingSubmission();
  const retryMutation = useSubmitWriting();
  const submission = workspaceQuery.data?.submissions.find((entry) => entry.id === submissionId);
  const prompt = workspaceQuery.data?.prompts.find((entry) => entry.id === submission?.promptId);
  const versions = useMemo(
    () =>
      [...(submission?.versions ?? [])].sort(
        (left, right) => left.versionNumber - right.versionNumber,
      ),
    [submission?.versions],
  );
  const currentVersion = versions.find((version) => version.id === submission?.currentVersionId);
  const [selectedVersionId, setSelectedVersionId] = useState<string>();
  const [comparisonIds, setComparisonIds] = useState<[string | undefined, string | undefined]>([
    undefined,
    undefined,
  ]);

  useEffect(() => {
    if (!selectedVersionId && currentVersion) {
      setSelectedVersionId(currentVersion.id);
    }
    if (!comparisonIds[0] && versions.length >= 2) {
      setComparisonIds([versions[0]?.id, versions.at(-1)?.id]);
    }
  }, [comparisonIds, currentVersion, selectedVersionId, versions]);

  const selectedVersion =
    versions.find((version) => version.id === selectedVersionId) ?? currentVersion;
  const comparisonPrevious = versions.find((version) => version.id === comparisonIds[0]);
  const comparisonCurrent = versions.find((version) => version.id === comparisonIds[1]);

  function confirmDelete() {
    if (!submission) {
      return;
    }
    Alert.alert("刪除作文", "這會刪除原文、所有版本與 AI 回饋，且無法復原。", [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: () => {
          void deleteMutation
            .mutateAsync(submission.id)
            .then(() => router.replace("/writing" as Href))
            .catch(() => undefined);
        },
      },
    ]);
  }

  async function retryCurrentVersion() {
    if (!submission || !prompt || !currentVersion) {
      return;
    }
    try {
      await retryMutation.mutateAsync({
        promptId: prompt.id,
        submissionId: submission.id,
        textDe: currentVersion.textDe,
        durationMs: 0,
        idempotencyKey: currentVersion.idempotencyKey,
      });
    } catch {
      // React Query exposes the user-facing error above the retry button.
    }
  }

  return (
    <AuthGate mode="protected">
      <ContentScreen
        action={
          submission ? (
            <IconButton
              accessibilityLabel="刪除這篇作文"
              icon={Trash2}
              onPress={confirmDelete}
              tone="danger"
            />
          ) : null
        }
        description={
          submission
            ? `${submission.level} · ${writingTypeLabel(submission.writingType)} · ${writingStatusLabel(submission.status)}`
            : undefined
        }
        eyebrow="作文版本"
        showBack
        title={prompt?.titleZhTw ?? "作文回饋"}
      >
        {workspaceQuery.isLoading ? (
          <StatePanel message="正在整理作文與回饋..." state="loading" title="載入作文" />
        ) : workspaceQuery.isError || !submission || !prompt ? (
          <StatePanel
            message={workspaceQuery.error?.message ?? "找不到這篇作文。"}
            onRetry={() => void workspaceQuery.refetch()}
            state="error"
            title="無法載入作文"
          />
        ) : (
          <>
            <MessageBanner message={deleteMutation.error?.message ?? null} tone="error" />
            <MessageBanner message={retryMutation.error?.message ?? null} tone="error" />

            <View style={styles.versionSection}>
              <Text style={styles.sectionTitle}>查看版本</Text>
              <VersionSelector
                onSelect={setSelectedVersionId}
                selectedId={selectedVersion?.id}
                versions={versions}
              />
              {selectedVersion ? (
                <Text style={styles.versionMeta}>
                  第 {selectedVersion.versionNumber} 版 · {selectedVersion.wordCount} 字 ·{" "}
                  {formatDate(selectedVersion.createdAt)}
                </Text>
              ) : null}
            </View>

            {selectedVersion?.feedback ? (
              <WritingFeedbackPanel
                key={selectedVersion.id}
                feedback={selectedVersion.feedback}
                textDe={selectedVersion.textDe}
              />
            ) : selectedVersion ? (
              <StatePanel
                message={
                  submission.status === "evaluation_failed"
                    ? "版本已保存，但 AI 尚未完成批改。可使用下方按鈕重試同一版。"
                    : "版本已保存，正在等待批改結果。"
                }
                state="empty"
                title="尚無批改回饋"
              />
            ) : null}

            {submission.status === "evaluation_failed" && currentVersion ? (
              <PrimaryButton
                accessibilityLabel="重試目前作文版本"
                loading={retryMutation.isPending}
                onPress={() => void retryCurrentVersion()}
                variant="secondary"
              >
                重試目前版本
              </PrimaryButton>
            ) : currentVersion?.feedback ? (
              <View style={styles.rewriteAction}>
                <Text style={styles.rewriteHint}>
                  下一步只處理上方三個重點，保留已經做好的部分。
                </Text>
                <PrimaryButton
                  accessibilityLabel="根據這些問題重寫作文"
                  onPress={() =>
                    router.push({
                      pathname: "/writing/editor/[promptId]",
                      params: { promptId: prompt.id, submissionId: submission.id },
                    } as unknown as Href)
                  }
                >
                  根據這些問題重寫
                </PrimaryButton>
              </View>
            ) : null}

            {versions.length >= 2 ? (
              <View style={styles.comparisonSection}>
                <Text style={styles.sectionTitle}>看見這次的進步</Text>
                <Text style={styles.sectionHint}>
                  預設比較第一版與最新版；也可自行選擇任意兩版。
                </Text>
                <View style={styles.comparisonControls}>
                  <View style={styles.comparisonControl}>
                    <Text style={styles.controlLabel}>前版</Text>
                    <VersionSelector
                      onSelect={(id) => setComparisonIds([id, comparisonIds[1]])}
                      selectedId={comparisonPrevious?.id}
                      versions={versions}
                    />
                  </View>
                  <View style={styles.comparisonControl}>
                    <Text style={styles.controlLabel}>後版</Text>
                    <VersionSelector
                      onSelect={(id) => setComparisonIds([comparisonIds[0], id])}
                      selectedId={comparisonCurrent?.id}
                      versions={versions}
                    />
                  </View>
                </View>
                {comparisonPrevious && comparisonCurrent ? (
                  comparisonPrevious.id === comparisonCurrent.id ? (
                    <MessageBanner message="請選擇兩個不同版本進行比較。" tone="info" />
                  ) : (
                    <>
                      {comparisonPrevious.feedback && comparisonCurrent.feedback ? (
                        <ImprovementSummary
                          currentFeedback={comparisonCurrent.feedback}
                          previousFeedback={comparisonPrevious.feedback}
                        />
                      ) : (
                        <MessageBanner
                          message="其中一版尚無批改結果，目前只能比較文字差異。"
                          tone="info"
                        />
                      )}
                      <WritingDiffView
                        currentLabel={`第 ${comparisonCurrent.versionNumber} 版`}
                        currentText={comparisonCurrent.textDe}
                        previousLabel={`第 ${comparisonPrevious.versionNumber} 版`}
                        previousText={comparisonPrevious.textDe}
                      />
                    </>
                  )
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </ContentScreen>
    </AuthGate>
  );
}

function ImprovementSummary({
  currentFeedback,
  previousFeedback,
}: {
  currentFeedback: NonNullable<WritingVersionData["feedback"]>;
  previousFeedback: NonNullable<WritingVersionData["feedback"]>;
}) {
  const summary = getWritingImprovementSummary(previousFeedback, currentFeedback);
  const scoreCopy =
    summary.scoreDelta > 0
      ? `總分提高 ${summary.scoreDelta} 分`
      : summary.scoreDelta === 0
        ? "總分維持不變"
        : `總分變化 ${summary.scoreDelta} 分`;

  return (
    <View style={styles.improvementCard}>
      <Text style={styles.improvementTitle}>{scoreCopy}</Text>
      <Text style={styles.improvementMeta}>
        {summary.resolvedErrorTypes.length > 0
          ? `已改善：${summary.resolvedErrorTypes.map(errorTypeLabel).join("、")}`
          : "尚未辨識出已完全消失的錯誤類型。"}
      </Text>
      <Text style={styles.improvementMeta}>
        {summary.remainingErrorTypes.length > 0
          ? `仍要加強：${summary.remainingErrorTypes.map(errorTypeLabel).join("、")}`
          : "最新版沒有行內錯誤，可繼續加強表達自然度。"}
      </Text>
    </View>
  );
}

function VersionSelector({
  onSelect,
  selectedId,
  versions,
}: {
  onSelect: (id: string) => void;
  selectedId?: string;
  versions: WritingVersionData[];
}) {
  return (
    <View accessibilityRole="tablist" style={styles.segmentedControl}>
      {versions.map((version) => {
        const selected = version.id === selectedId;
        return (
          <Pressable
            accessibilityLabel={`第 ${version.versionNumber} 版`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={version.id}
            onPress={() => onSelect(version.id)}
            style={({ pressed }) => [
              styles.segment,
              selected ? styles.segmentSelected : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.segmentText, selected ? styles.segmentTextSelected : null]}>
              V{version.versionNumber}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  comparisonControl: {
    flex: 1,
    gap: spacingTokens.sm,
    minWidth: 180,
  },
  comparisonControls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.md,
  },
  comparisonSection: {
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
    gap: spacingTokens.md,
    paddingTop: spacingTokens.lg,
  },
  improvementCard: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderRadius: 8,
    borderWidth: 1,
    gap: spacingTokens.sm,
    padding: spacingTokens.md,
  },
  improvementMeta: {
    color: colorTokens.text,
    fontSize: 14,
    lineHeight: 21,
  },
  improvementTitle: {
    color: colorTokens.success,
    fontSize: 17,
    fontWeight: "900",
  },
  controlLabel: {
    color: colorTokens.mutedText,
    fontSize: 13,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.72,
  },
  rewriteAction: {
    gap: spacingTokens.sm,
  },
  rewriteHint: {
    color: colorTokens.mutedText,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  sectionHint: {
    color: colorTokens.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionTitle: {
    color: colorTokens.text,
    fontSize: 17,
    fontWeight: "800",
  },
  segment: {
    alignItems: "center",
    borderRadius: 6,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacingTokens.sm,
  },
  segmentSelected: {
    backgroundColor: colorTokens.primary,
  },
  segmentText: {
    color: colorTokens.mutedText,
    fontSize: 13,
    fontWeight: "800",
  },
  segmentTextSelected: {
    color: "#FFFFFF",
  },
  segmentedControl: {
    backgroundColor: colorTokens.subtle,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.xs,
    padding: spacingTokens.xs,
  },
  versionMeta: {
    color: colorTokens.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  versionSection: {
    gap: spacingTokens.sm,
  },
});
