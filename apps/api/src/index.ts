export interface ApiHealth {
  status: "ok";
  service: "deutschtrainer-api";
}

export function getApiHealth(): ApiHealth {
  return {
    status: "ok",
    service: "deutschtrainer-api",
  };
}

export { createApiHandler } from "./app";
export { readApiConfig } from "./config";
export { ResponseEvaluationService, validateFeedback } from "./evaluation/evaluationService";
export {
  DeterministicEvaluationProvider,
  EvaluationProviderError,
  OpenAiEvaluationProvider,
  UnavailableEvaluationProvider,
} from "./evaluation/openAiEvaluationProvider";
export { SupabaseEvaluationRepository } from "./evaluation/supabaseEvaluationRepository";
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
