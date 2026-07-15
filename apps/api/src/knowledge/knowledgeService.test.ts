import { describe, expect, it } from "@jest/globals";
import type {
  GrammarTopic,
  KnowledgeExerciseLink,
  VocabularyItem,
} from "@deutschtrainer/shared-types";
import { KnowledgeService } from "./knowledgeService";
import type { KnowledgeRepository, RelatedKnowledgeAliases } from "./types";

const vocabulary: VocabularyItem[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    lemma: "obwohl",
    partOfSpeech: "Konjunktion",
    principalParts: [],
    reflexive: false,
    level: "B1",
    frequencyRank: 101,
    definitionsZhTw: ["雖然、儘管"],
    exampleSentences: ["Obwohl es regnet, gehen wir spazieren."],
    collocations: [],
    synonyms: ["obgleich"],
    antonyms: [],
    register: "neutral",
    region: "general",
    version: 1,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    lemma: "die Miete",
    partOfSpeech: "Nomen",
    gender: "die",
    plural: "die Mieten",
    principalParts: [],
    reflexive: false,
    level: "B1",
    frequencyRank: 104,
    definitionsZhTw: ["租金"],
    exampleSentences: ["Die Miete ist jeden Monat fällig."],
    collocations: ["Miete zahlen"],
    synonyms: [],
    antonyms: [],
    register: "neutral",
    region: "DE",
    version: 1,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    lemma: "mitnichten",
    partOfSpeech: "Adverb",
    principalParts: [],
    reflexive: false,
    level: "C2",
    frequencyRank: 401,
    definitionsZhTw: ["絕非"],
    exampleSentences: ["Die Reform war mitnichten ein Erfolg."],
    collocations: [],
    synonyms: ["keineswegs"],
    antonyms: [],
    register: "formal",
    region: "general",
    version: 1,
  },
];

const grammarTopics: GrammarTopic[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    code: "B1.nebensatz",
    titleZhTw: "從句動詞末位",
    titleDe: "Verbendstellung im Nebensatz",
    level: "B1",
    shortExplanationZhTw: "weil、obwohl 等連接詞會把變位動詞推到句末。",
    fullExplanationZhTw: "先辨識主從句邊界，再把變位動詞放在從句末位。",
    rules: [
      {
        titleZhTw: "基本語序",
        explanationZhTw: "變位動詞位於從句末位。",
        patternDe: "Konjunktion + ... + Verb",
      },
    ],
    examples: [{ textDe: "..., weil es regnet.", translationZhTw: "因為正在下雨。" }],
    commonMistakes: [
      {
        incorrectDe: "..., weil es regnet stark.",
        correctDe: "..., weil es stark regnet.",
        explanationZhTw: "regnet 要放在從句末位。",
      },
    ],
    relatedSkillIds: ["B1.word_order.subordinate_clause"],
    prerequisiteTopicIds: [],
    difficulty: 2,
    version: 1,
  },
];

const relatedExercise: KnowledgeExerciseLink = {
  id: "30000000-0000-4000-8000-000000000001",
  lessonId: "40000000-0000-4000-8000-000000000001",
  lessonTitleZhTw: "說明原因與讓步",
  title: "說明原因與讓步：填空",
  level: "B1",
  type: "fill_blank",
};

describe("KnowledgeService", () => {
  it("searches vocabulary across German and Traditional Chinese fields", async () => {
    const service = new KnowledgeService(new FakeKnowledgeRepository());

    const byChinese = await service.listVocabulary({ query: "租金", page: 1, pageSize: 20 });
    const byGerman = await service.listVocabulary({ query: "OBGLEICH", page: 1, pageSize: 20 });

    expect(byChinese.items.map((item) => item.lemma)).toEqual(["die Miete"]);
    expect(byGerman.items.map((item) => item.lemma)).toEqual(["obwohl"]);
  });

  it("filters vocabulary without collapsing the available facets", async () => {
    const service = new KnowledgeService(new FakeKnowledgeRepository());

    const result = await service.listVocabulary({
      level: "B1",
      partOfSpeech: "Nomen",
      page: 1,
      pageSize: 1,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.gender).toBe("die");
    expect(result.facets.partsOfSpeech).toEqual(["Konjunktion", "Nomen"]);
  });

  it("searches grammar explanations and returns compact summaries", async () => {
    const service = new KnowledgeService(new FakeKnowledgeRepository());

    const result = await service.listGrammarTopics({ query: "obwohl", page: 1, pageSize: 20 });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({ code: "B1.nebensatz", difficulty: 2 });
  });

  it("returns detailed content and resolves related exercises by aliases", async () => {
    const repository = new FakeKnowledgeRepository();
    const service = new KnowledgeService(repository);

    const vocabularyDetail = await service.getVocabularyItem(vocabulary[1]!.id);
    expect(vocabularyDetail.relatedExercises).toEqual([relatedExercise]);
    expect(repository.lastAliases?.vocabulary).toContain("Miete");

    const grammarDetail = await service.getGrammarTopic(grammarTopics[0]!.id);
    expect(grammarDetail.topic.rules[0]?.patternDe).toContain("Verb");
    expect(repository.lastAliases?.grammar).toContain("B1.nebensatz");
  });

  it("hides missing or unpublished knowledge behind a public 404", async () => {
    const service = new KnowledgeService(new FakeKnowledgeRepository());

    await expect(
      service.getVocabularyItem("90000000-0000-4000-8000-000000000001"),
    ).rejects.toMatchObject({ code: "CONTENT_NOT_PUBLISHED", status: 404 });
    await expect(
      service.getGrammarTopic("90000000-0000-4000-8000-000000000002"),
    ).rejects.toMatchObject({ code: "CONTENT_NOT_PUBLISHED", status: 404 });
  });
});

class FakeKnowledgeRepository implements KnowledgeRepository {
  lastAliases?: RelatedKnowledgeAliases;

  async listPublishedVocabulary(): Promise<VocabularyItem[]> {
    return vocabulary;
  }

  async getPublishedVocabularyItem(itemId: string): Promise<VocabularyItem | undefined> {
    return vocabulary.find((item) => item.id === itemId);
  }

  async listPublishedGrammarTopics(): Promise<GrammarTopic[]> {
    return grammarTopics;
  }

  async getPublishedGrammarTopic(topicId: string): Promise<GrammarTopic | undefined> {
    return grammarTopics.find((topic) => topic.id === topicId);
  }

  async getRelatedExercises(aliases: RelatedKnowledgeAliases): Promise<KnowledgeExerciseLink[]> {
    this.lastAliases = aliases;
    return [relatedExercise];
  }
}
