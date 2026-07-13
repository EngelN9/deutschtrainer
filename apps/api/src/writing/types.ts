import type { AiPromptMessage } from "@deutschtrainer/ai-prompts";
import type { WritingFeedback } from "@deutschtrainer/ai-schemas";
import type { ErrorType, WritingDiffChange, WritingPrompt } from "@deutschtrainer/shared-types";
import type { EvaluateWritingRequest, EvaluateWritingResponse } from "@deutschtrainer/validation";
import type { AuthenticatedLearner } from "../evaluation/types";

export interface ProtectedWritingPrompt extends WritingPrompt {
  gradingNotesZhTw: string;
  referenceOutlineZhTw: string[];
  referenceVersionDe: string;
}

export interface WritingSubmissionContext {
  submissionId: string;
  promptId: string;
  currentVersionId: string;
  currentVersionNumber: number;
  currentTextDe: string;
  currentFeedback?: WritingFeedback;
}

export interface StoredWritingVersion {
  promptId: string;
  submissionId: string;
  versionId: string;
  versionNumber: number;
  previousVersionId?: string;
  textDe: string;
  wordCount: number;
  diff: WritingDiffChange[];
  feedbackId?: string;
  feedback?: WritingFeedback;
  previousFeedback?: WritingFeedback;
  model?: string;
}

export interface PrepareWritingVersionInput {
  learner: AuthenticatedLearner;
  prompt: ProtectedWritingPrompt;
  submissionId?: string;
  expectedCurrentVersionId?: string;
  textDe: string;
  wordCount: number;
  diff: WritingDiffChange[];
  idempotencyKey: string;
}

export interface PreparedWritingVersion {
  submissionId: string;
  versionId: string;
  versionNumber: number;
  previousVersionId?: string;
  created: boolean;
}

export interface WritingFeedbackRecordInput {
  learnerId: string;
  versionId: string;
  feedback: WritingFeedback;
  model: string;
  schemaVersion: string;
  promptId: string;
  promptVersion: string;
}

export interface WritingFeedbackRecordResult {
  feedbackId: string;
  idempotentReplay: boolean;
}

export interface WritingUsageLogInput {
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
  logicalRequest: boolean;
  errorCode?: string;
}

export interface WritingRepository {
  authenticate(accessToken: string): Promise<AuthenticatedLearner | undefined>;
  findByIdempotency(
    learnerId: string,
    idempotencyKey: string,
  ): Promise<StoredWritingVersion | undefined>;
  getPrompt(promptId: string): Promise<ProtectedWritingPrompt | undefined>;
  getSubmissionContext(
    learnerId: string,
    submissionId: string,
  ): Promise<WritingSubmissionContext | undefined>;
  countRecentLogicalRequests(learnerId: string, since: string): Promise<number>;
  prepareVersion(input: PrepareWritingVersionInput): Promise<PreparedWritingVersion>;
  recordFeedback(input: WritingFeedbackRecordInput): Promise<WritingFeedbackRecordResult>;
  markEvaluationFailed(learnerId: string, versionId: string): Promise<void>;
  recordUsage(input: WritingUsageLogInput): Promise<void>;
}

export interface ProviderWritingInput {
  prompt: ProtectedWritingPrompt;
  learnerTextDe: string;
  versionNumber: number;
  previousErrorTypes: ErrorType[];
  messages: AiPromptMessage[];
  jsonSchema: Record<string, unknown>;
}

export interface ProviderWritingResult {
  payload: unknown;
  model: string;
  providerRequestId?: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface WritingProvider {
  readonly model: string;
  readonly configured: boolean;
  evaluate(input: ProviderWritingInput): Promise<ProviderWritingResult>;
}

export interface WritingService {
  evaluate(accessToken: string, request: EvaluateWritingRequest): Promise<EvaluateWritingResponse>;
}
