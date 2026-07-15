import { useDeferredValue, useEffect, useState } from "react";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { BookOpen, ChevronLeft, ChevronRight, Languages, Search } from "lucide-react-native";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { CefrLevel } from "@deutschtrainer/shared-types";
import { SUPPORTED_LEVELS } from "@deutschtrainer/shared-types";
import { colorTokens, spacingTokens } from "@deutschtrainer/ui";
import { AuthGate } from "../src/features/auth/AuthGate";
import { useConnectivityStore } from "../src/features/offline/connectivityStore";
import { OfflineStatusBand } from "../src/features/offline/OfflineStatusBand";
import { useGrammarTopicList, useVocabularyList } from "../src/features/knowledge/useKnowledge";
import { ContentScreen } from "../src/components/ContentScreen";
import { MainNavigation } from "../src/components/MainNavigation";
import { StatePanel } from "../src/components/StatePanel";

type KnowledgeMode = "vocabulary" | "grammar";

export default function KnowledgeScreen() {
  const router = useRouter();
  const connectivity = useConnectivityStore((state) => state.status);
  const [mode, setMode] = useState<KnowledgeMode>("vocabulary");
  const [level, setLevel] = useState<CefrLevel | undefined>();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query.trim());
  const pageSize = 12;
  const vocabularyQuery = useVocabularyList(
    {
      ...(level ? { level } : {}),
      ...(deferredQuery ? { query: deferredQuery } : {}),
      page,
      pageSize,
    },
    mode === "vocabulary",
  );
  const grammarQuery = useGrammarTopicList(
    {
      ...(level ? { level } : {}),
      ...(deferredQuery ? { query: deferredQuery } : {}),
      page,
      pageSize,
    },
    mode === "grammar",
  );
  const activeQuery = mode === "vocabulary" ? vocabularyQuery : grammarQuery;
  const total = activeQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [deferredQuery, level, mode]);

  return (
    <AuthGate mode="protected">
      <ContentScreen
        description="B1-C2 單字資訊與繁體中文文法解析。"
        eyebrow="學習工具"
        title="單字與文法"
      >
        <OfflineStatusBand />
        <View accessibilityRole="tablist" style={styles.modeControl}>
          <ModeOption
            active={mode === "vocabulary"}
            icon={Languages}
            label="單字庫"
            onPress={() => setMode("vocabulary")}
          />
          <ModeOption
            active={mode === "grammar"}
            icon={BookOpen}
            label="文法庫"
            onPress={() => setMode("grammar")}
          />
        </View>

        <View style={styles.searchField}>
          <Search color={colorTokens.mutedText} size={20} />
          <TextInput
            accessibilityLabel="搜尋單字或文法"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder={mode === "vocabulary" ? "搜尋德語或繁中釋義" : "搜尋文法或繁中解釋"}
            placeholderTextColor="#6B7280"
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
        </View>

        <View
          accessibilityLabel="CEFR 程度篩選"
          accessibilityRole="radiogroup"
          style={styles.levels}
        >
          <LevelOption active={!level} label="全部" onPress={() => setLevel(undefined)} />
          {SUPPORTED_LEVELS.map((entry) => (
            <LevelOption
              active={level === entry}
              key={entry}
              label={entry}
              onPress={() => setLevel(entry)}
            />
          ))}
        </View>

        {connectivity === "offline" ? (
          <StatePanel
            message="單字與文法知識庫需要網路連線；已下載課程仍可從課程頁離線閱讀。"
            state="empty"
            title="目前為離線狀態"
          />
        ) : activeQuery.isLoading ? (
          <StatePanel message="正在整理符合條件的內容..." state="loading" title="載入知識庫" />
        ) : activeQuery.isError ? (
          <StatePanel
            message={activeQuery.error.message}
            onRetry={() => void activeQuery.refetch()}
            state="error"
            title="無法載入知識庫"
          />
        ) : total === 0 ? (
          <StatePanel
            message="目前沒有符合搜尋與程度條件的已發布內容。"
            state="empty"
            title="找不到結果"
          />
        ) : (
          <View style={styles.results}>
            <Text accessibilityLiveRegion="polite" style={styles.resultCount}>
              {total} 筆結果
            </Text>
            {mode === "vocabulary"
              ? vocabularyQuery.data?.items.map((item) => (
                  <Pressable
                    accessibilityLabel={`查看單字 ${item.lemma}`}
                    accessibilityRole="button"
                    key={item.id}
                    onPress={() => router.push(`/vocabulary/${item.id}` as Href)}
                    style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardTitleWrap}>
                        <Text style={styles.germanTitle}>{item.lemma}</Text>
                        <Text style={styles.metaText}>
                          {[
                            item.partOfSpeech,
                            formatRegister(item.register),
                            formatRegion(item.region),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      </View>
                      <LevelBadge level={item.level} />
                    </View>
                    <Text style={styles.summary}>{item.definitionsZhTw.join("；")}</Text>
                    <ChevronRight color={colorTokens.primary} size={20} style={styles.cardArrow} />
                  </Pressable>
                ))
              : grammarQuery.data?.items.map((topic) => (
                  <Pressable
                    accessibilityLabel={`查看文法 ${topic.titleZhTw}`}
                    accessibilityRole="button"
                    key={topic.id}
                    onPress={() => router.push(`/grammar/${topic.id}` as Href)}
                    style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardTitleWrap}>
                        <Text style={styles.chineseTitle}>{topic.titleZhTw}</Text>
                        <Text style={styles.germanSubtitle}>{topic.titleDe}</Text>
                      </View>
                      <LevelBadge level={topic.level} />
                    </View>
                    <Text style={styles.summary}>{topic.shortExplanationZhTw}</Text>
                    <Text style={styles.difficulty}>難度 {topic.difficulty} / 5</Text>
                    <ChevronRight color={colorTokens.primary} size={20} style={styles.cardArrow} />
                  </Pressable>
                ))}
            {pageCount > 1 ? (
              <View style={styles.pagination}>
                <PageButton
                  disabled={page <= 1}
                  icon={ChevronLeft}
                  label="上一頁"
                  onPress={() => setPage((current) => Math.max(1, current - 1))}
                />
                <Text style={styles.pageText}>
                  {page} / {pageCount}
                </Text>
                <PageButton
                  disabled={page >= pageCount}
                  icon={ChevronRight}
                  label="下一頁"
                  onPress={() => setPage((current) => Math.min(pageCount, current + 1))}
                />
              </View>
            ) : null}
          </View>
        )}
        <MainNavigation />
      </ContentScreen>
    </AuthGate>
  );
}

function ModeOption({
  active,
  icon: Icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: typeof Languages;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.modeOption, active ? styles.modeOptionActive : null]}
    >
      <Icon color={active ? colorTokens.primary : colorTokens.mutedText} size={20} />
      <Text style={[styles.modeLabel, active ? styles.modeLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function LevelOption({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label}程度`}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={[styles.levelOption, active ? styles.levelOptionActive : null]}
    >
      <Text style={[styles.levelOptionText, active ? styles.levelOptionTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function LevelBadge({ level }: { level: CefrLevel }) {
  return (
    <View style={styles.levelBadge}>
      <Text style={styles.levelBadgeText}>{level}</Text>
    </View>
  );
}

function PageButton({
  disabled,
  icon: Icon,
  label,
  onPress,
}: {
  disabled: boolean;
  icon: typeof ChevronLeft;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.pageButton, disabled ? styles.disabled : null]}
    >
      <Icon color={colorTokens.text} size={20} />
    </Pressable>
  );
}

function formatRegister(value: string): string {
  return { neutral: "中性", formal: "正式", informal: "非正式", academic: "學術" }[value] ?? value;
}

function formatRegion(value: string): string {
  return { general: "通用", DE: "德國", AT: "奧地利", CH: "瑞士" }[value] ?? value;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacingTokens.sm,
    minHeight: 132,
    padding: spacingTokens.md,
    paddingRight: 46,
    position: "relative",
  },
  cardArrow: { position: "absolute", right: spacingTokens.md, top: 54 },
  cardTitleWrap: { flex: 1, gap: spacingTokens.xs, minWidth: 0 },
  cardTopRow: { alignItems: "flex-start", flexDirection: "row", gap: spacingTokens.md },
  chineseTitle: { color: colorTokens.text, fontSize: 18, fontWeight: "800", lineHeight: 25 },
  difficulty: { color: colorTokens.accent, fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.38 },
  germanSubtitle: { color: colorTokens.mutedText, fontSize: 14, lineHeight: 20 },
  germanTitle: { color: colorTokens.text, fontSize: 21, fontWeight: "800", lineHeight: 28 },
  levelBadge: {
    alignItems: "center",
    backgroundColor: "#E8F0FE",
    borderRadius: 6,
    height: 30,
    justifyContent: "center",
    width: 40,
  },
  levelBadgeText: { color: colorTokens.primaryDark, fontSize: 12, fontWeight: "900" },
  levelOption: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 0,
  },
  levelOptionActive: { backgroundColor: colorTokens.primary },
  levelOptionText: { color: colorTokens.mutedText, fontSize: 13, fontWeight: "800" },
  levelOptionTextActive: { color: "#FFFFFF" },
  levels: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.xs,
    padding: spacingTokens.xs,
  },
  metaText: { color: colorTokens.mutedText, fontSize: 13, lineHeight: 19 },
  modeControl: {
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    padding: spacingTokens.xs,
  },
  modeLabel: { color: colorTokens.mutedText, fontSize: 15, fontWeight: "800" },
  modeLabelActive: { color: colorTokens.primary },
  modeOption: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    flexDirection: "row",
    gap: spacingTokens.sm,
    justifyContent: "center",
    minHeight: 46,
  },
  modeOptionActive: { backgroundColor: "#E8F0FE" },
  pageButton: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pageText: {
    color: colorTokens.text,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    minWidth: 64,
    textAlign: "center",
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacingTokens.md,
    justifyContent: "center",
  },
  pressed: { opacity: 0.72 },
  resultCount: { color: colorTokens.mutedText, fontSize: 13, fontWeight: "700" },
  results: { gap: spacingTokens.md },
  searchField: {
    alignItems: "center",
    backgroundColor: colorTokens.surface,
    borderColor: colorTokens.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacingTokens.sm,
    minHeight: 50,
    paddingHorizontal: spacingTokens.md,
  },
  searchInput: {
    color: colorTokens.text,
    flex: 1,
    fontSize: 16,
    minHeight: 48,
    paddingVertical: 0,
  },
  summary: { color: colorTokens.text, fontSize: 15, lineHeight: 22 },
});
