import type { GrammarTopic, VocabularyItem } from "@deutschtrainer/shared-types";
import type {
  GrammarTopicDetailResponse,
  GrammarTopicListRequest,
  GrammarTopicListResponse,
  VocabularyDetailResponse,
  VocabularyListRequest,
  VocabularyListResponse,
} from "@deutschtrainer/validation";
import { ApiError } from "../errors";
import type { KnowledgeRepository, KnowledgeServiceContract } from "./types";

export class KnowledgeService implements KnowledgeServiceContract {
  constructor(private readonly repository: KnowledgeRepository) {}

  async listVocabulary(request: VocabularyListRequest): Promise<VocabularyListResponse> {
    const allItems = await this.repository.listPublishedVocabulary();
    const searched = allItems.filter(
      (item) =>
        (!request.level || item.level === request.level) &&
        matchesQuery(vocabularySearchText(item), request.query),
    );
    const facets = {
      partsOfSpeech: uniqueSorted(searched.map((item) => item.partOfSpeech)),
      registers: uniqueSorted(searched.map((item) => item.register)),
      regions: uniqueSorted(searched.map((item) => item.region)),
    };
    const filtered = searched
      .filter((item) => !request.partOfSpeech || item.partOfSpeech === request.partOfSpeech)
      .filter((item) => !request.register || item.register === request.register)
      .filter((item) => !request.region || item.region === request.region);
    filtered.sort(compareVocabulary);

    return {
      items: paginate(filtered, request.page, request.pageSize).map((item) => ({
        id: item.id,
        lemma: item.lemma,
        partOfSpeech: item.partOfSpeech,
        ...(item.gender ? { gender: item.gender } : {}),
        level: item.level,
        definitionsZhTw: item.definitionsZhTw,
        register: item.register,
        region: item.region,
        version: item.version,
      })),
      total: filtered.length,
      page: request.page,
      pageSize: request.pageSize,
      facets,
    };
  }

  async getVocabularyItem(itemId: string): Promise<VocabularyDetailResponse> {
    const item = await this.repository.getPublishedVocabularyItem(itemId);
    if (!item) {
      throw new ApiError("CONTENT_NOT_PUBLISHED", "找不到已發布的單字。", 404, false);
    }
    const relatedExercises = await this.repository.getRelatedExercises({
      vocabulary: [item.id, item.lemma, stripLeadingArticle(item.lemma)],
    });
    return { item, relatedExercises: relatedExercises.slice(0, 20) };
  }

  async listGrammarTopics(request: GrammarTopicListRequest): Promise<GrammarTopicListResponse> {
    const searched = (await this.repository.listPublishedGrammarTopics()).filter(
      (topic) =>
        (!request.level || topic.level === request.level) &&
        matchesQuery(grammarSearchText(topic), request.query),
    );
    const difficulties = uniqueSorted(searched.map((topic) => topic.difficulty));
    const filtered = searched.filter(
      (topic) => !request.difficulty || topic.difficulty === request.difficulty,
    );
    filtered.sort(compareGrammarTopics);

    return {
      items: paginate(filtered, request.page, request.pageSize).map((topic) => ({
        id: topic.id,
        code: topic.code,
        titleZhTw: topic.titleZhTw,
        titleDe: topic.titleDe,
        level: topic.level,
        shortExplanationZhTw: topic.shortExplanationZhTw,
        difficulty: topic.difficulty,
        version: topic.version,
      })),
      total: filtered.length,
      page: request.page,
      pageSize: request.pageSize,
      difficulties,
    };
  }

  async getGrammarTopic(topicId: string): Promise<GrammarTopicDetailResponse> {
    const topic = await this.repository.getPublishedGrammarTopic(topicId);
    if (!topic) {
      throw new ApiError("CONTENT_NOT_PUBLISHED", "找不到已發布的文法主題。", 404, false);
    }
    const relatedExercises = await this.repository.getRelatedExercises({
      grammar: [topic.id, topic.code, topic.titleZhTw, topic.titleDe],
    });
    return { topic, relatedExercises: relatedExercises.slice(0, 20) };
  }
}

function matchesQuery(searchText: string, query?: string): boolean {
  if (!query?.trim()) {
    return true;
  }
  return normalizeSearchText(searchText).includes(normalizeSearchText(query));
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("de-DE").replace(/\s+/g, " ").trim();
}

function vocabularySearchText(item: VocabularyItem): string {
  return [
    item.lemma,
    item.partOfSpeech,
    ...item.definitionsZhTw,
    ...item.exampleSentences,
    ...item.collocations,
    ...item.synonyms,
    ...item.antonyms,
    item.requiredPreposition,
    item.separablePrefix,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

function grammarSearchText(topic: GrammarTopic): string {
  return [
    topic.code,
    topic.titleZhTw,
    topic.titleDe,
    topic.shortExplanationZhTw,
    topic.fullExplanationZhTw,
    ...topic.rules.flatMap((rule) => [rule.titleZhTw, rule.explanationZhTw, rule.patternDe]),
    ...topic.examples.flatMap((example) => [example.textDe, example.translationZhTw]),
    ...topic.commonMistakes.flatMap((mistake) => [
      mistake.incorrectDe,
      mistake.correctDe,
      mistake.explanationZhTw,
    ]),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

function compareVocabulary(left: VocabularyItem, right: VocabularyItem): number {
  const level = left.level.localeCompare(right.level);
  if (level !== 0) {
    return level;
  }
  const leftRank = left.frequencyRank ?? Number.MAX_SAFE_INTEGER;
  const rightRank = right.frequencyRank ?? Number.MAX_SAFE_INTEGER;
  return leftRank - rightRank || left.lemma.localeCompare(right.lemma, "de-DE");
}

function compareGrammarTopics(left: GrammarTopic, right: GrammarTopic): number {
  return (
    left.level.localeCompare(right.level) ||
    left.difficulty - right.difficulty ||
    left.titleDe.localeCompare(right.titleDe, "de-DE")
  );
}

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function uniqueSorted<T extends number | string>(values: T[]): T[] {
  return [...new Set(values)].sort((left, right) =>
    typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right), "de-DE"),
  );
}

function stripLeadingArticle(lemma: string): string {
  return lemma.replace(/^(der|die|das)\s+/i, "");
}
