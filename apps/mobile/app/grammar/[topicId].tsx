import { useLocalSearchParams } from "expo-router";
import { CheckCircle2, XCircle } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../../src/features/auth/AuthGate";
import {
  KnowledgeDetailSection,
  KnowledgeMetaGrid,
  RelatedExerciseList,
} from "../../src/features/knowledge/KnowledgeDetailParts";
import { useGrammarTopic } from "../../src/features/knowledge/useKnowledge";
import { useConnectivityStore } from "../../src/features/offline/connectivityStore";
import { ContentScreen } from "../../src/components/ContentScreen";
import { StatePanel } from "../../src/components/StatePanel";
import { TagList } from "../../src/components/TagList";

export default function GrammarDetailScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const connectivity = useConnectivityStore((state) => state.status);
  const query = useGrammarTopic(topicId);
  const topic = query.data?.topic;
  const relatedExercises = query.data?.relatedExercises ?? [];

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description={topic?.titleDe ?? "繁體中文文法解析"}
        eyebrow={topic ? `${topic.level} · 文法庫` : "文法庫"}
        showBack
        title={topic?.titleZhTw ?? "文法詳解"}
      >
        {connectivity === "offline" ? (
          <StatePanel
            message="恢復網路後即可讀取完整文法內容。"
            state="empty"
            title="目前為離線狀態"
          />
        ) : query.isLoading ? (
          <StatePanel message="正在載入規則與例句..." state="loading" title="載入文法" />
        ) : query.isError ? (
          <StatePanel
            message={query.error.message}
            onRetry={() => void query.refetch()}
            state="error"
            title="無法載入文法"
          />
        ) : topic ? (
          <>
            <View style={styles.summaryBand}>
              <Text style={styles.summaryShort}>{topic.shortExplanationZhTw}</Text>
              <Text style={styles.summaryFull}>{topic.fullExplanationZhTw}</Text>
            </View>

            <KnowledgeDetailSection title="主題資訊">
              <KnowledgeMetaGrid
                items={[
                  { label: "CEFR", value: topic.level },
                  { label: "難度", value: `${topic.difficulty} / 5` },
                  { label: "德文名稱", value: topic.titleDe },
                  { label: "主題代碼", value: topic.code },
                ]}
              />
            </KnowledgeDetailSection>

            <KnowledgeDetailSection title="核心規則">
              <View style={styles.rules}>
                {topic.rules.map((rule) => (
                  <View key={rule.titleZhTw} style={styles.rule}>
                    <Text style={styles.ruleTitle}>{rule.titleZhTw}</Text>
                    <Text style={styles.bodyText}>{rule.explanationZhTw}</Text>
                    {rule.patternDe ? (
                      <Text selectable style={styles.pattern}>
                        {rule.patternDe}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </KnowledgeDetailSection>

            <KnowledgeDetailSection title="德語例句">
              <View style={styles.examples}>
                {topic.examples.map((example) => (
                  <View key={example.textDe} style={styles.example}>
                    <Text selectable style={styles.exampleDe}>
                      {example.textDe}
                    </Text>
                    <Text style={styles.exampleZh}>{example.translationZhTw}</Text>
                    {example.noteZhTw ? (
                      <Text style={styles.exampleNote}>{example.noteZhTw}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </KnowledgeDetailSection>

            <KnowledgeDetailSection title="常見錯誤">
              <View style={styles.mistakes}>
                {topic.commonMistakes.map((mistake) => (
                  <View key={mistake.incorrectDe} style={styles.mistake}>
                    <View style={styles.comparisonRow}>
                      <XCircle color={colorTokens.danger} size={20} />
                      <Text selectable style={[styles.comparisonText, styles.incorrect]}>
                        {mistake.incorrectDe}
                      </Text>
                    </View>
                    <View style={styles.comparisonRow}>
                      <CheckCircle2 color={colorTokens.success} size={20} />
                      <Text selectable style={[styles.comparisonText, styles.correct]}>
                        {mistake.correctDe}
                      </Text>
                    </View>
                    <Text style={styles.explanation}>{mistake.explanationZhTw}</Text>
                  </View>
                ))}
              </View>
            </KnowledgeDetailSection>

            {topic.relatedSkillIds.length ? (
              <KnowledgeDetailSection title="相關技能">
                <TagList items={topic.relatedSkillIds} />
              </KnowledgeDetailSection>
            ) : null}
            {topic.prerequisiteTopicIds.length ? (
              <KnowledgeDetailSection title="先備主題">
                <TagList items={topic.prerequisiteTopicIds} />
              </KnowledgeDetailSection>
            ) : null}

            <KnowledgeDetailSection title="相關練習">
              <RelatedExerciseList items={relatedExercises} />
            </KnowledgeDetailSection>
          </>
        ) : (
          <StatePanel message="找不到這筆已發布文法主題。" state="empty" title="文法不存在" />
        )}
      </ContentScreen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  bodyText: { color: colorTokens.text, fontSize: 15, lineHeight: 23 },
  comparisonRow: { alignItems: "flex-start", flexDirection: "row", gap: spacingTokens.sm },
  comparisonText: { flex: 1, fontSize: 15, lineHeight: 22 },
  correct: { color: colorTokens.success },
  example: {
    borderLeftColor: colorTokens.teal,
    borderLeftWidth: 3,
    gap: spacingTokens.xs,
    paddingLeft: spacingTokens.md,
  },
  exampleDe: { color: colorTokens.text, fontSize: 16, fontWeight: "700", lineHeight: 24 },
  exampleNote: { color: colorTokens.teal, fontSize: 13, lineHeight: 19 },
  examples: { gap: spacingTokens.lg },
  exampleZh: { color: colorTokens.mutedText, fontSize: 14, lineHeight: 21 },
  explanation: { color: colorTokens.mutedText, fontSize: 14, lineHeight: 21, paddingLeft: 28 },
  incorrect: { color: colorTokens.danger },
  mistake: {
    backgroundColor: colorTokens.subtle,
    borderRadius: 8,
    gap: spacingTokens.sm,
    padding: spacingTokens.md,
  },
  mistakes: { gap: spacingTokens.md },
  pattern: {
    backgroundColor: "#E8F0FE",
    borderRadius: 6,
    color: colorTokens.primaryDark,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    padding: spacingTokens.sm,
  },
  rule: { gap: spacingTokens.sm },
  rules: { gap: spacingTokens.lg },
  ruleTitle: { color: colorTokens.teal, fontSize: 16, fontWeight: "800", lineHeight: 23 },
  summaryBand: {
    backgroundColor: "#E7F3F0",
    borderLeftColor: colorTokens.teal,
    borderLeftWidth: 4,
    gap: spacingTokens.sm,
    padding: spacingTokens.md,
  },
  summaryFull: { color: colorTokens.text, fontSize: 15, lineHeight: 23 },
  summaryShort: { color: "#0A5C55", fontSize: 17, fontWeight: "800", lineHeight: 24 },
});
