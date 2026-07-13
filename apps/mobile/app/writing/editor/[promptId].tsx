import { useEffect, useRef, useState } from "react";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Clock3 } from "lucide-react-native";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../../../src/features/auth/AuthGate";
import { ContentScreen } from "../../../src/components/ContentScreen";
import { MessageBanner } from "../../../src/components/MessageBanner";
import { PrimaryButton } from "../../../src/components/PrimaryButton";
import { StatePanel } from "../../../src/components/StatePanel";
import {
  useSubmitWriting,
  useWritingWorkspace,
} from "../../../src/features/writing/useWritingWorkspace";
import { writingTypeLabel } from "../../../src/features/writing/writingLabels";

export default function WritingEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ promptId: string; submissionId?: string }>();
  const workspaceQuery = useWritingWorkspace();
  const submitMutation = useSubmitWriting();
  const [textDe, setTextDe] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [savedFallback, setSavedFallback] = useState(false);
  const [idempotencyKey] = useState(createIdempotencyKey);
  const startedAt = useRef(Date.now());
  const prompt = workspaceQuery.data?.prompts.find((entry) => entry.id === params.promptId);
  const submission = params.submissionId
    ? workspaceQuery.data?.submissions.find((entry) => entry.id === params.submissionId)
    : undefined;
  const currentVersion = submission?.versions.find(
    (version) => version.id === submission.currentVersionId,
  );
  const wordCount = countWords(textDe);

  useEffect(() => {
    if (!initialized && workspaceQuery.data) {
      setTextDe(currentVersion?.textDe ?? "");
      setInitialized(true);
    }
  }, [currentVersion?.textDe, initialized, workspaceQuery.data]);

  async function handleSubmit() {
    if (!prompt) {
      return;
    }
    try {
      const result = await submitMutation.mutateAsync({
        promptId: prompt.id,
        ...(submission ? { submissionId: submission.id } : {}),
        textDe,
        durationMs: Math.min(Date.now() - startedAt.current, 14_400_000),
        idempotencyKey,
      });
      if (result.status === "completed") {
        router.replace({
          pathname: "/writing/[submissionId]",
          params: { submissionId: result.submissionId },
        } as unknown as Href);
        return;
      }
      setSavedFallback(true);
    } catch {
      // React Query exposes the user-facing error below the editor.
    }
  }

  const withinLimit = Boolean(
    prompt && wordCount >= prompt.minimumWords && wordCount <= prompt.maximumWords,
  );

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description={
          prompt
            ? `${writingTypeLabel(prompt.writingType)} · ${prompt.minimumWords}–${prompt.maximumWords} 字`
            : undefined
        }
        eyebrow={submission ? `重寫第 ${(currentVersion?.versionNumber ?? 1) + 1} 版` : "第一稿"}
        showBack
        title={prompt?.titleZhTw ?? "作文編輯器"}
      >
        {workspaceQuery.isLoading ? (
          <StatePanel message="正在讀取作文題目..." state="loading" title="載入編輯器" />
        ) : workspaceQuery.isError || !prompt ? (
          <StatePanel
            message={workspaceQuery.error?.message ?? "找不到這個作文題目。"}
            onRetry={() => void workspaceQuery.refetch()}
            state="error"
            title="無法開啟題目"
          />
        ) : (
          <>
            <View style={styles.promptSection}>
              <Text selectable style={styles.promptDe}>
                {prompt.promptDe}
              </Text>
              <Text style={styles.promptZh}>{prompt.promptZhTw}</Text>
              <View style={styles.requirements}>
                {prompt.requirementsZhTw.map((requirement) => (
                  <View key={requirement} style={styles.requirementRow}>
                    <Check color={colorTokens.success} size={17} />
                    <Text style={styles.requirementText}>{requirement}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.editorSection}>
              <View style={styles.editorHeading}>
                <Text style={styles.label}>德語作文</Text>
                <View style={styles.counterRow}>
                  <Clock3 color={colorTokens.mutedText} size={15} />
                  <Text
                    style={[
                      styles.counter,
                      wordCount > prompt.maximumWords ? styles.counterError : null,
                    ]}
                  >
                    {wordCount} / {prompt.minimumWords}–{prompt.maximumWords} 字
                  </Text>
                </View>
              </View>
              <TextInput
                accessibilityLabel="德語作文內容"
                autoCapitalize="sentences"
                editable={!savedFallback && !submitMutation.isPending}
                multiline
                onChangeText={setTextDe}
                placeholder="Schreiben Sie hier Ihren Text ..."
                style={styles.editor}
                textAlignVertical="top"
                value={textDe}
              />
            </View>

            <MessageBanner message={submitMutation.error?.message ?? null} tone="error" />
            <MessageBanner
              message={
                savedFallback ? "這一版已保存，但 AI 尚未完成批改。請保留目前內容並重試。" : null
              }
              tone="info"
            />
            <PrimaryButton
              accessibilityLabel={savedFallback ? "重試作文批改" : "送出作文批改"}
              disabled={!withinLimit}
              loading={submitMutation.isPending}
              onPress={() => void handleSubmit()}
            >
              {savedFallback ? "重試這一版" : submission ? "送出重寫版本" : "送出第一稿"}
            </PrimaryButton>
          </>
        )}
      </ContentScreen>
    </AuthGate>
  );
}

function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/u).length;
}

function createIdempotencyKey(): string {
  return `writing-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

const styles = StyleSheet.create({
  counter: {
    color: colorTokens.mutedText,
    fontSize: 13,
    fontWeight: "700",
  },
  counterError: {
    color: colorTokens.danger,
  },
  counterRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.xs,
  },
  editor: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colorTokens.text,
    fontSize: 17,
    lineHeight: 27,
    minHeight: 330,
    padding: spacingTokens.md,
  },
  editorHeading: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingTokens.sm,
    justifyContent: "space-between",
  },
  editorSection: {
    gap: spacingTokens.sm,
  },
  label: {
    color: colorTokens.text,
    fontSize: 16,
    fontWeight: "800",
  },
  promptDe: {
    color: colorTokens.text,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 27,
  },
  promptSection: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacingTokens.md,
    padding: spacingTokens.md,
  },
  promptZh: {
    color: colorTokens.mutedText,
    fontSize: 15,
    lineHeight: 23,
  },
  requirementRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacingTokens.sm,
  },
  requirementText: {
    color: colorTokens.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  requirements: {
    borderTopColor: colorTokens.border,
    borderTopWidth: 1,
    gap: spacingTokens.sm,
    paddingTop: spacingTokens.md,
  },
});
