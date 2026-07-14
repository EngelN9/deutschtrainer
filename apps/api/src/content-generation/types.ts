import type { GeneratedExerciseDraft } from "@deutschtrainer/ai-schemas";
import type { AiPromptMessage } from "@deutschtrainer/ai-prompts";
import type { CefrLevel, ContentTeamRole } from "@deutschtrainer/shared-types";
import type {
  GenerateExerciseDraftRequest,
  GenerateExerciseDraftResponse,
} from "@deutschtrainer/validation";

export interface AuthenticatedContentUser {
  authUserId: string;
  profileId: string;
  role: ContentTeamRole;
}

export interface GenerationActivityContext {
  activityId: string;
  lessonId: string;
  level: CefrLevel;
  skillCodes: string[];
}

export interface StoredGeneration {
  jobId: string;
  exerciseId: string;
  contentVersionId: string;
  draft: GeneratedExerciseDraft;
}

export interface PersistedGeneratedExerciseDraft extends GeneratedExerciseDraft {
  payloadJson: Record<string, unknown>;
  grammarTopicIds: string[];
  vocabularyIds: string[];
  options: Array<
    GeneratedExerciseDraft["options"][number] & {
      id: string;
      orderIndex: number;
    }
  >;
  answerJson: Record<string, unknown>;
  gradingPolicyJson: Record<string, unknown>;
}

export interface GenerationRecordResult {
  jobId: string;
  exerciseId: string;
  contentVersionId: string;
  status: "draft";
  reviewStatus: "draft";
  sourceType: "ai_generated";
}

export interface GenerationUsageInput {
  userId: string;
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

export interface ContentGenerationRepository {
  authenticate(accessToken: string): Promise<AuthenticatedContentUser | undefined>;
  getActivityContext(
    activityId: string,
    targetSkillIds: string[],
  ): Promise<GenerationActivityContext | undefined>;
  findByIdempotency(userId: string, idempotencyKey: string): Promise<StoredGeneration | undefined>;
  countRecentLogicalRequests(userId: string, since: string): Promise<number>;
  createJob(user: AuthenticatedContentUser, request: GenerateExerciseDraftRequest): Promise<string>;
  recordDraft(
    jobId: string,
    draft: PersistedGeneratedExerciseDraft,
    model: string,
    providerRequestId?: string,
  ): Promise<GenerationRecordResult>;
  markJobFailed(jobId: string, errorCode: string, issues: string[]): Promise<void>;
  recordUsage(input: GenerationUsageInput): Promise<void>;
}

export interface ProviderGenerationInput {
  request: GenerateExerciseDraftRequest;
  messages: AiPromptMessage[];
  jsonSchema: Record<string, unknown>;
}

export interface ProviderGenerationResult {
  payload: unknown;
  model: string;
  providerRequestId?: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface ContentGenerationProvider {
  readonly model: string;
  readonly configured: boolean;
  generate(input: ProviderGenerationInput): Promise<ProviderGenerationResult>;
}

export interface ContentGenerationServiceContract {
  generateExerciseDraft(
    accessToken: string,
    request: GenerateExerciseDraftRequest,
  ): Promise<GenerateExerciseDraftResponse>;
}
