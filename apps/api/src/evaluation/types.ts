import type { AiEvaluationFeedback } from "@deutschtrainer/ai-schemas";
import type { AiPromptMessage } from "@deutschtrainer/ai-prompts";
import type { AiEvaluatedExerciseType, CefrLevel } from "@deutschtrainer/shared-types";
import type { EvaluateResponseRequest, EvaluateResponseResponse } from "@deutschtrainer/validation";

export interface AuthenticatedLearner {
  authUserId: string;
  profileId: string;
  timezone: string;
}

export interface EvaluationExercise {
  id: string;
  lessonId: string;
  version: number;
  type: AiEvaluatedExerciseType;
  level: CefrLevel;
  instructionZhTw: string;
  promptDe: string;
  promptZhTw?: string;
  skillIds: string[];
  referenceAnswersDe: string[];
  gradingNotesZhTw: string;
  minimumCharacters: number;
  maximumCharacters: number;
}

export interface StoredEvaluation {
  attemptId: string;
  feedbackId: string;
  feedback: AiEvaluationFeedback;
  model: string;
  cached: boolean;
  completionPercent: number;
}

export interface CachedEvaluation {
  feedbackId: string;
  feedback: AiEvaluationFeedback;
  model: string;
}

export interface EvaluationRecordInput {
  learner: AuthenticatedLearner;
  request: EvaluateResponseRequest;
  exercise: EvaluationExercise;
  feedback: AiEvaluationFeedback;
  model: string;
  schemaVersion: string;
  promptId: string;
  promptVersion: string;
  cacheKey: string;
  cachedFromId?: string;
}

export interface EvaluationRecordResult {
  attemptId: string;
  feedbackId: string;
  completionPercent: number;
  idempotentReplay: boolean;
}

export interface UsageLogInput {
  learnerId: string;
  requestId: string;
  idempotencyKey: string;
  model: string;
  providerRequestId?: string;
  providerAttempt: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  latencyMs: number;
  success: boolean;
  cached: boolean;
  logicalRequest: boolean;
  errorCode?: string;
}

export interface EvaluationRepository {
  authenticate(accessToken: string): Promise<AuthenticatedLearner | undefined>;
  findByIdempotency(
    learnerId: string,
    idempotencyKey: string,
  ): Promise<StoredEvaluation | undefined>;
  findCached(learnerId: string, cacheKey: string): Promise<CachedEvaluation | undefined>;
  getExercise(exerciseId: string): Promise<EvaluationExercise | undefined>;
  countRecentLogicalRequests(learnerId: string, since: string): Promise<number>;
  recordEvaluation(input: EvaluationRecordInput): Promise<EvaluationRecordResult>;
  recordUsage(input: UsageLogInput): Promise<void>;
}

export interface ProviderEvaluationInput {
  exercise: EvaluationExercise;
  learnerResponseDe: string;
  messages: AiPromptMessage[];
  jsonSchema: Record<string, unknown>;
}

export interface ProviderEvaluationResult {
  payload: unknown;
  model: string;
  providerRequestId?: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface EvaluationProvider {
  readonly model: string;
  readonly configured: boolean;
  evaluate(input: ProviderEvaluationInput): Promise<ProviderEvaluationResult>;
}

export interface EvaluationService {
  evaluate(
    accessToken: string,
    request: EvaluateResponseRequest,
  ): Promise<EvaluateResponseResponse>;
}
