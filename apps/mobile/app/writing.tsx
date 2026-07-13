import { useMemo, useState } from "react";
import type { CefrLevel } from "@deutschtrainer/shared-types";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { ChevronRight, Clock3, FilePenLine, History } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../src/features/auth/AuthGate";
import { ContentScreen } from "../src/components/ContentScreen";
import { LevelSelector } from "../src/components/LevelSelector";
import { MainNavigation } from "../src/components/MainNavigation";
import { StatePanel } from "../src/components/StatePanel";
import { useWritingWorkspace } from "../src/features/writing/useWritingWorkspace";
import { writingStatusLabel, writingTypeLabel } from "../src/features/writing/writingLabels";

export default function WritingScreen() {
  const router = useRouter();
  const [level, setLevel] = useState<CefrLevel>("B1");
  const workspaceQuery = useWritingWorkspace();
  const prompts = useMemo(
    () => workspaceQuery.data?.prompts.filter((prompt) => prompt.level === level) ?? [],
    [level, workspaceQuery.data],
  );
  const submissions = workspaceQuery.data?.submissions ?? [];

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description="選擇符合程度的任務，完成第一稿後依批改重寫並比較版本。"
        eyebrow="作文訓練"
        title="把德語寫得更精準"
      >
        <LevelSelector onChange={setLevel} value={level} />
        {workspaceQuery.isLoading ? (
          <StatePanel message="正在同步題目與作文版本..." state="loading" title="載入寫作資料" />
        ) : workspaceQuery.isError ? (
          <StatePanel
            message={workspaceQuery.error.message}
            onRetry={() => void workspaceQuery.refetch()}
            state="error"
            title="無法載入寫作資料"
          />
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <FilePenLine color={colorTokens.primary} size={20} />
                <Text style={styles.sectionTitle}>{level} 寫作任務</Text>
              </View>
              {prompts.length > 0 ? (
                <View style={styles.promptList}>
                  {prompts.map((prompt) => (
                    <Pressable
                      accessibilityLabel={`開始 ${prompt.titleZhTw}`}
                      accessibilityRole="button"
                      key={prompt.id}
                      onPress={() =>
                        router.push({
                          pathname: "/writing/editor/[promptId]",
                          params: { promptId: prompt.id },
                        } as unknown as Href)
                      }
                      style={({ pressed }) => [styles.prompt, pressed ? styles.pressed : null]}
                    >
                      <View style={styles.promptCopy}>
                        <View style={styles.metaRow}>
                          <Text style={styles.typeLabel}>
                            {writingTypeLabel(prompt.writingType)}
                          </Text>
                          <View style={styles.inlineMeta}>
                            <Clock3 color={colorTokens.mutedText} size={14} />
                            <Text style={styles.meta}>{prompt.estimatedMinutes} 分</Text>
                          </View>
                        </View>
                        <Text style={styles.promptTitle}>{prompt.titleZhTw}</Text>
                        <Text numberOfLines={3} style={styles.promptText}>
                          {prompt.promptDe}
                        </Text>
                        <Text style={styles.wordLimit}>
                          {prompt.minimumWords}–{prompt.maximumWords} 字
                        </Text>
                      </View>
                      <ChevronRight color={colorTokens.mutedText} size={21} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>這個程度目前沒有已發布的作文題目。</Text>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <History color={colorTokens.teal} size={20} />
                <Text style={styles.sectionTitle}>最近作文</Text>
              </View>
              {submissions.length > 0 ? (
                <View style={styles.submissionList}>
                  {submissions.slice(0, 8).map((submission) => {
                    const prompt = workspaceQuery.data?.prompts.find(
                      (entry) => entry.id === submission.promptId,
                    );
                    const currentVersion = submission.versions.find(
                      (version) => version.id === submission.currentVersionId,
                    );
                    return (
                      <Pressable
                        accessibilityLabel={`查看 ${prompt?.titleZhTw ?? "作文"}`}
                        accessibilityRole="button"
                        key={submission.id}
                        onPress={() =>
                          router.push({
                            pathname: "/writing/[submissionId]",
                            params: { submissionId: submission.id },
                          } as unknown as Href)
                        }
                        style={({ pressed }) => [
                          styles.submissionRow,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <View style={styles.submissionCopy}>
                          <Text style={styles.submissionTitle}>
                            {prompt?.titleZhTw ?? writingTypeLabel(submission.writingType)}
                          </Text>
                          <Text style={styles.meta}>
                            {submission.level} · 第 {currentVersion?.versionNumber ?? 1} 版 ·{" "}
                            {writingStatusLabel(submission.status)}
                          </Text>
                        </View>
                        <ChevronRight color={colorTokens.mutedText} size={20} />
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyText}>送出第一篇作文後，版本紀錄會顯示在這裡。</Text>
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
  emptyText: {
    color: colorTokens.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  inlineMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.xs,
  },
  meta: {
    color: colorTokens.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.sm,
    justifyContent: "space-between",
  },
  pressed: {
    opacity: 0.72,
  },
  prompt: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.md,
    padding: spacingTokens.md,
  },
  promptCopy: {
    flex: 1,
    gap: spacingTokens.sm,
    minWidth: 0,
  },
  promptList: {
    gap: spacingTokens.md,
  },
  promptText: {
    color: colorTokens.mutedText,
    fontSize: 14,
    lineHeight: 22,
  },
  promptTitle: {
    color: colorTokens.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 25,
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
  submissionCopy: {
    flex: 1,
    gap: spacingTokens.xs,
  },
  submissionList: {
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
  },
  submissionRow: {
    alignItems: "center",
    borderBottomColor: colorTokens.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.md,
    minHeight: 70,
    paddingVertical: spacingTokens.md,
  },
  submissionTitle: {
    color: colorTokens.text,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22,
  },
  typeLabel: {
    color: colorTokens.teal,
    fontSize: 12,
    fontWeight: "800",
  },
  wordLimit: {
    color: colorTokens.primary,
    fontSize: 13,
    fontWeight: "800",
  },
});
