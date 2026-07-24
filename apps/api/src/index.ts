export interface ApiHealth {
  aiConfigured: boolean;
  release: string;
  status: "ok";
  service: "deutschtrainer-api";
}

export function getApiHealth(): ApiHealth {
  return {
    aiConfigured: false,
    release: "library",
    status: "ok",
    service: "deutschtrainer-api",
  };
}

export { createApiHandler } from "./app";
export { readApiConfig } from "./config";
export {
  AudioLearningService,
  buildSpeakingFeedback,
  scoreWordComparison,
} from "./audio/audioService";
export {
  AudioProviderError,
  DeterministicAudioProvider,
  OpenAiAudioProvider,
  UnavailableAudioProvider,
} from "./audio/openAiAudioProvider";
export { SupabaseAudioRepository } from "./audio/supabaseAudioRepository";
export {
  ContentGenerationService,
  validateGeneratedDraft,
} from "./content-generation/contentGenerationService";
export {
  ContentGenerationProviderError,
  DeterministicContentGenerationProvider,
  OpenAiContentGenerationProvider,
  UnavailableContentGenerationProvider,
} from "./content-generation/openAiContentGenerationProvider";
export { SupabaseContentGenerationRepository } from "./content-generation/supabaseContentGenerationRepository";
export { ResponseEvaluationService, validateFeedback } from "./evaluation/evaluationService";
export {
  DeterministicEvaluationProvider,
  EvaluationProviderError,
  OpenAiEvaluationProvider,
  UnavailableEvaluationProvider,
} from "./evaluation/openAiEvaluationProvider";
export { SupabaseEvaluationRepository } from "./evaluation/supabaseEvaluationRepository";
export { LearningDataService } from "./learning-data/learningDataService";
export { SupabaseLearningDataRepository } from "./learning-data/supabaseLearningDataRepository";
export { KnowledgeService } from "./knowledge/knowledgeService";
export { SupabaseKnowledgeRepository } from "./knowledge/supabaseKnowledgeRepository";
export { SupabaseWritingRepository } from "./writing/supabaseWritingRepository";
export {
  WritingEvaluationService,
  countGermanWords,
  createWritingDiff,
  validateWritingFeedback,
} from "./writing/writingService";
export {
  DeterministicWritingProvider,
  OpenAiWritingProvider,
  UnavailableWritingProvider,
  WritingProviderError,
} from "./writing/openAiWritingProvider";
