import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../../src/features/auth/AuthGate";
import { AudioPlayerControls } from "../../src/features/audio-learning/AudioPlayerControls";
import {
  KnowledgeDetailSection,
  KnowledgeMetaGrid,
  RelatedExerciseList,
} from "../../src/features/knowledge/KnowledgeDetailParts";
import { useVocabularyItem } from "../../src/features/knowledge/useKnowledge";
import { useConnectivityStore } from "../../src/features/offline/connectivityStore";
import { ContentScreen } from "../../src/components/ContentScreen";
import { StatePanel } from "../../src/components/StatePanel";
import { TagList } from "../../src/components/TagList";

export default function VocabularyDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const connectivity = useConnectivityStore((state) => state.status);
  const query = useVocabularyItem(itemId);
  const item = query.data?.item;
  const relatedExercises = query.data?.relatedExercises ?? [];

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description={item ? item.definitionsZhTw.join("；") : "單字資訊"}
        eyebrow={item ? `${item.level} · 單字庫` : "單字庫"}
        showBack
        title={item?.lemma ?? "單字詳解"}
      >
        {connectivity === "offline" ? (
          <StatePanel
            message="恢復網路後即可讀取完整單字資訊。"
            state="empty"
            title="目前為離線狀態"
          />
        ) : query.isLoading ? (
          <StatePanel message="正在載入詞形與例句..." state="loading" title="載入單字" />
        ) : query.isError ? (
          <StatePanel
            message={query.error.message}
            onRetry={() => void query.refetch()}
            state="error"
            title="無法載入單字"
          />
        ) : item ? (
          <>
            <View style={styles.definitionBand}>
              <Text style={styles.definitionLabel}>繁中釋義</Text>
              {item.definitionsZhTw.map((definition) => (
                <Text key={definition} style={styles.definitionText}>
                  {definition}
                </Text>
              ))}
            </View>

            <KnowledgeDetailSection title="詞彙資訊">
              <KnowledgeMetaGrid
                items={[
                  { label: "詞性", value: item.partOfSpeech },
                  { label: "性別", value: item.gender },
                  { label: "複數", value: item.plural },
                  {
                    label: "動詞三態",
                    value: item.principalParts.length ? item.principalParts.join(" · ") : undefined,
                  },
                  { label: "可分前綴", value: item.separablePrefix },
                  { label: "反身動詞", value: item.reflexive ? "是" : undefined },
                  { label: "支配格", value: formatCase(item.governingCase) },
                  { label: "介系詞搭配", value: item.requiredPreposition },
                  { label: "語域", value: formatRegister(item.register) },
                  { label: "地區", value: formatRegion(item.region) },
                  {
                    label: "頻率順位",
                    value: item.frequencyRank ? String(item.frequencyRank) : undefined,
                  },
                ]}
              />
            </KnowledgeDetailSection>

            <KnowledgeDetailSection title="德語例句">
              <View style={styles.examples}>
                {item.exampleSentences.map((sentence, index) => (
                  <View key={`${sentence}-${index}`} style={styles.example}>
                    <Text style={styles.exampleNumber}>{index + 1}</Text>
                    <Text selectable style={styles.exampleText}>
                      {sentence}
                    </Text>
                  </View>
                ))}
              </View>
              {item.audioUrl ? <AudioPlayerControls sourceUri={item.audioUrl} /> : null}
            </KnowledgeDetailSection>

            {item.collocations.length ? (
              <KnowledgeDetailSection title="常見搭配">
                <TagList items={item.collocations} />
              </KnowledgeDetailSection>
            ) : null}
            {item.synonyms.length || item.antonyms.length ? (
              <KnowledgeDetailSection title="近義與反義">
                {item.synonyms.length ? (
                  <View style={styles.wordGroup}>
                    <Text style={styles.groupLabel}>近義</Text>
                    <TagList items={item.synonyms} />
                  </View>
                ) : null}
                {item.antonyms.length ? (
                  <View style={styles.wordGroup}>
                    <Text style={styles.groupLabel}>反義</Text>
                    <TagList items={item.antonyms} />
                  </View>
                ) : null}
              </KnowledgeDetailSection>
            ) : null}

            <KnowledgeDetailSection title="相關練習">
              <RelatedExerciseList items={relatedExercises} />
            </KnowledgeDetailSection>
          </>
        ) : (
          <StatePanel message="找不到這筆已發布單字。" state="empty" title="單字不存在" />
        )}
      </ContentScreen>
    </AuthGate>
  );
}

function formatCase(value?: string): string | undefined {
  if (!value) return undefined;
  return {
    nominative: "第一格",
    accusative: "第四格",
    dative: "第三格",
    genitive: "第二格",
  }[value];
}

function formatRegister(value: string): string {
  return { neutral: "中性", formal: "正式", informal: "非正式", academic: "學術" }[value] ?? value;
}

function formatRegion(value: string): string {
  return { general: "通用", DE: "德國", AT: "奧地利", CH: "瑞士" }[value] ?? value;
}

const styles = StyleSheet.create({
  definitionBand: {
    backgroundColor: "#E8F0FE",
    borderLeftColor: colorTokens.primary,
    borderLeftWidth: 4,
    gap: spacingTokens.xs,
    padding: spacingTokens.md,
  },
  definitionLabel: { color: colorTokens.primaryDark, fontSize: 12, fontWeight: "800" },
  definitionText: { color: colorTokens.text, fontSize: 18, fontWeight: "800", lineHeight: 26 },
  example: { alignItems: "flex-start", flexDirection: "row", gap: spacingTokens.sm },
  exampleNumber: {
    color: colorTokens.teal,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 24,
    width: 20,
  },
  examples: { gap: spacingTokens.md },
  exampleText: { color: colorTokens.text, flex: 1, fontSize: 16, lineHeight: 24 },
  groupLabel: { color: colorTokens.mutedText, fontSize: 13, fontWeight: "800" },
  wordGroup: { gap: spacingTokens.sm },
});
