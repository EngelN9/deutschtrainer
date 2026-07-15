import type {
  GrammarTopic,
  KnowledgeExerciseLink,
  VocabularyItem,
} from "@deutschtrainer/shared-types";
import type {
  GrammarTopicDetailResponse,
  GrammarTopicListRequest,
  GrammarTopicListResponse,
  VocabularyDetailResponse,
  VocabularyListRequest,
  VocabularyListResponse,
} from "@deutschtrainer/validation";

export interface RelatedKnowledgeAliases {
  grammar?: string[];
  vocabulary?: string[];
}

export interface KnowledgeRepository {
  listPublishedVocabulary(): Promise<VocabularyItem[]>;
  getPublishedVocabularyItem(itemId: string): Promise<VocabularyItem | undefined>;
  listPublishedGrammarTopics(): Promise<GrammarTopic[]>;
  getPublishedGrammarTopic(topicId: string): Promise<GrammarTopic | undefined>;
  getRelatedExercises(aliases: RelatedKnowledgeAliases): Promise<KnowledgeExerciseLink[]>;
}

export interface KnowledgeServiceContract {
  listVocabulary(request: VocabularyListRequest): Promise<VocabularyListResponse>;
  getVocabularyItem(itemId: string): Promise<VocabularyDetailResponse>;
  listGrammarTopics(request: GrammarTopicListRequest): Promise<GrammarTopicListResponse>;
  getGrammarTopic(topicId: string): Promise<GrammarTopicDetailResponse>;
}
