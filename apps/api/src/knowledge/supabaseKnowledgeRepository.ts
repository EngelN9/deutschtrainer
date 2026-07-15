import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  CefrLevel,
  GrammarTopic,
  KnowledgeExerciseLink,
  VocabularyItem,
} from "@deutschtrainer/shared-types";
import {
  grammarTopicSchema,
  knowledgeExerciseLinkSchema,
  vocabularyItemSchema,
} from "@deutschtrainer/validation";
import { ApiError } from "../errors";
import type { KnowledgeRepository, RelatedKnowledgeAliases } from "./types";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

interface VocabularyRow {
  id: string;
  lemma: string;
  part_of_speech: string;
  gender: string | null;
  plural: string | null;
  principal_parts_json: Json;
  separable_prefix: string | null;
  reflexive: boolean;
  governing_case: string | null;
  required_preposition: string | null;
  level: CefrLevel;
  frequency_rank: number | null;
  definitions_zh_tw: string[];
  example_sentences: string[];
  collocations_json: Json;
  synonyms_json: Json;
  antonyms_json: Json;
  register: string;
  region: string;
  audio_url: string | null;
  version: number;
}

interface GrammarTopicRow {
  id: string;
  code: string;
  title_zh_tw: string;
  title_de: string;
  level: CefrLevel;
  short_explanation_zh_tw: string;
  full_explanation_zh_tw: string;
  rules_json: Json;
  examples_json: Json;
  common_mistakes_json: Json;
  related_skill_ids: string[];
  prerequisite_topic_ids: string[];
  difficulty: number;
  version: number;
}

interface RelatedExerciseRow {
  id: string;
  activity_id: string;
  level: CefrLevel;
  type: string;
  title: string;
  grammar_topic_ids: string[];
  vocabulary_ids: string[];
}

interface ActivityLinkRow {
  id: string;
  lesson_id: string;
}

interface LessonLinkRow {
  id: string;
  title_zh_tw: string;
}

export class SupabaseKnowledgeRepository implements KnowledgeRepository {
  private readonly client: SupabaseClient;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async listPublishedVocabulary(): Promise<VocabularyItem[]> {
    const result = await this.client
      .from("vocabulary")
      .select(
        "id, lemma, part_of_speech, gender, plural, principal_parts_json, separable_prefix, reflexive, governing_case, required_preposition, level, frequency_rank, definitions_zh_tw, example_sentences, collocations_json, synonyms_json, antonyms_json, register, region, audio_url, version",
      )
      .eq("status", "published")
      .order("level")
      .order("frequency_rank", { nullsFirst: false })
      .order("lemma");
    assertDatabaseResult(result.error, "無法載入已發布單字。", result.status);
    return ((result.data ?? []) as VocabularyRow[]).map(mapVocabularyItem);
  }

  async getPublishedVocabularyItem(itemId: string): Promise<VocabularyItem | undefined> {
    return (await this.listPublishedVocabulary()).find((item) => item.id === itemId);
  }

  async listPublishedGrammarTopics(): Promise<GrammarTopic[]> {
    const result = await this.client
      .from("grammar_topics")
      .select(
        "id, code, title_zh_tw, title_de, level, short_explanation_zh_tw, full_explanation_zh_tw, rules_json, examples_json, common_mistakes_json, related_skill_ids, prerequisite_topic_ids, difficulty, version",
      )
      .eq("status", "published")
      .order("level")
      .order("difficulty")
      .order("title_de");
    assertDatabaseResult(result.error, "無法載入已發布文法主題。", result.status);
    return ((result.data ?? []) as GrammarTopicRow[]).map(mapGrammarTopic);
  }

  async getPublishedGrammarTopic(topicId: string): Promise<GrammarTopic | undefined> {
    return (await this.listPublishedGrammarTopics()).find((topic) => topic.id === topicId);
  }

  async getRelatedExercises(aliases: RelatedKnowledgeAliases): Promise<KnowledgeExerciseLink[]> {
    const exerciseResult = await this.client
      .from("exercises")
      .select("id, activity_id, level, type, title, grammar_topic_ids, vocabulary_ids")
      .eq("status", "published")
      .eq("review_status", "approved")
      .is("deleted_at", null);
    assertDatabaseResult(exerciseResult.error, "無法載入相關練習。", exerciseResult.status);
    const exercises = ((exerciseResult.data ?? []) as RelatedExerciseRow[]).filter(
      (exercise) =>
        matchesAnyAlias(exercise.grammar_topic_ids, aliases.grammar) ||
        matchesAnyAlias(exercise.vocabulary_ids, aliases.vocabulary),
    );
    if (exercises.length === 0) {
      return [];
    }

    const activityResult = await this.client
      .from("activities")
      .select("id, lesson_id")
      .in(
        "id",
        exercises.map((exercise) => exercise.activity_id),
      )
      .eq("status", "published")
      .is("deleted_at", null);
    assertDatabaseResult(activityResult.error, "無法載入相關練習課堂。", activityResult.status);
    const activities = (activityResult.data ?? []) as ActivityLinkRow[];
    const activityById = new Map(activities.map((activity) => [activity.id, activity]));
    const lessonIds = [...new Set(activities.map((activity) => activity.lesson_id))];
    if (lessonIds.length === 0) {
      return [];
    }

    const lessonResult = await this.client
      .from("lessons")
      .select("id, title_zh_tw")
      .in("id", lessonIds)
      .eq("status", "published")
      .is("deleted_at", null);
    assertDatabaseResult(lessonResult.error, "無法載入相關練習課堂。", lessonResult.status);
    const lessonById = new Map(
      ((lessonResult.data ?? []) as LessonLinkRow[]).map((lesson) => [lesson.id, lesson]),
    );

    const links = exercises.flatMap((exercise) => {
      const activity = activityById.get(exercise.activity_id);
      const lesson = activity ? lessonById.get(activity.lesson_id) : undefined;
      if (!activity || !lesson) {
        return [];
      }
      return [
        knowledgeExerciseLinkSchema.parse({
          id: exercise.id,
          lessonId: lesson.id,
          lessonTitleZhTw: lesson.title_zh_tw,
          title: exercise.title,
          level: exercise.level,
          type: exercise.type,
        }),
      ];
    });
    links.sort(
      (left, right) =>
        left.level.localeCompare(right.level) || left.title.localeCompare(right.title, "zh-Hant"),
    );
    return links;
  }
}

function mapVocabularyItem(row: VocabularyRow): VocabularyItem {
  return vocabularyItemSchema.parse({
    id: row.id,
    lemma: row.lemma,
    partOfSpeech: row.part_of_speech,
    ...(row.gender ? { gender: row.gender } : {}),
    ...(row.plural ? { plural: row.plural } : {}),
    principalParts: row.principal_parts_json,
    ...(row.separable_prefix ? { separablePrefix: row.separable_prefix } : {}),
    reflexive: row.reflexive,
    ...(row.governing_case ? { governingCase: row.governing_case } : {}),
    ...(row.required_preposition ? { requiredPreposition: row.required_preposition } : {}),
    level: row.level,
    ...(row.frequency_rank ? { frequencyRank: row.frequency_rank } : {}),
    definitionsZhTw: row.definitions_zh_tw,
    exampleSentences: row.example_sentences,
    collocations: row.collocations_json,
    synonyms: row.synonyms_json,
    antonyms: row.antonyms_json,
    register: row.register,
    region: row.region,
    ...(row.audio_url ? { audioUrl: row.audio_url } : {}),
    version: row.version,
  });
}

function mapGrammarTopic(row: GrammarTopicRow): GrammarTopic {
  return grammarTopicSchema.parse({
    id: row.id,
    code: row.code,
    titleZhTw: row.title_zh_tw,
    titleDe: row.title_de,
    level: row.level,
    shortExplanationZhTw: row.short_explanation_zh_tw,
    fullExplanationZhTw: row.full_explanation_zh_tw,
    rules: row.rules_json,
    examples: row.examples_json,
    commonMistakes: row.common_mistakes_json,
    relatedSkillIds: row.related_skill_ids,
    prerequisiteTopicIds: row.prerequisite_topic_ids,
    difficulty: row.difficulty,
    version: row.version,
  });
}

function matchesAnyAlias(tags: string[], aliases?: string[]): boolean {
  if (!aliases?.length) {
    return false;
  }
  const normalizedAliases = aliases.map(normalizeAlias).filter((alias) => alias.length >= 2);
  return tags.some((tag) => {
    const normalizedTag = normalizeAlias(tag);
    return normalizedAliases.some(
      (alias) =>
        normalizedTag === alias || normalizedTag.includes(alias) || alias.includes(normalizedTag),
    );
  });
}

function normalizeAlias(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("de-DE").replace(/\s+/g, " ").trim();
}

function assertDatabaseResult(
  error: { message: string } | null,
  message: string,
  _status?: number,
): void {
  if (error) {
    throw new ApiError("DATABASE_ERROR", `${message} ${error.message}`, 500, true);
  }
}
