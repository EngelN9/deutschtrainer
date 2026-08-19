import type { ConversationFeedback, ConversationTurn } from "@deutschtrainer/ai-schemas";
import type { AiPromptMessage, ConversationPromptMessage } from "@deutschtrainer/ai-prompts";
import type {
  CompleteConversationRequest,
  CompleteConversationResponse,
  ConversationDetailResponse,
  ConversationListResponse,
  ConversationScenario,
  ConversationScenarioListResponse,
  ConversationSession,
  CreateConversationRequest,
  CreateConversationResponse,
  DeleteConversationResponse,
  SendConversationMessageRequest,
  SendConversationMessageResponse,
} from "@deutschtrainer/validation";
import type { AiQuotaReservation } from "../ai-quota/types";
import type { AuthenticatedLearner } from "../evaluation/types";

export interface ProtectedConversationScenario extends ConversationScenario {
  openingMessageDe: string;
  goals: string[];
  evaluationNotesZhTw: string;
  allowedSkillIds: string[];
}

export interface ConversationContext {
  session: ConversationSession;
  scenario: ProtectedConversationScenario;
  quotaReservation: AiQuotaReservation;
  providerCallCount: number;
}

export interface ConversationUsageInput {
  learnerId: string;
  sessionId: string;
  idempotencyKey: string;
  model: string;
  providerRequestId?: string;
  providerAttempt: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
}

export interface ConversationRepository {
  authenticate(accessToken: string): Promise<AuthenticatedLearner | undefined>;
  listScenarios(): Promise<ConversationScenario[]>;
  listSessions(learnerId: string): Promise<ConversationListResponse>;
  getContext(learnerId: string, sessionId: string): Promise<ConversationContext | undefined>;
  findSessionByIdempotency(
    learnerId: string,
    idempotencyKey: string,
  ): Promise<ConversationSession | undefined>;
  hasMessageIdempotency(sessionId: string, idempotencyKey: string): Promise<boolean>;
  createSession(input: {
    learnerId: string;
    request: CreateConversationRequest;
    reservation: AiQuotaReservation;
  }): Promise<string>;
  appendTurn(input: {
    learnerId: string;
    sessionId: string;
    expectedLearnerTurn: number;
    idempotencyKey: string;
    userContent: string;
    assistantContent: string;
  }): Promise<void>;
  completeSession(input: {
    learnerId: string;
    sessionId: string;
    feedback: ConversationFeedback;
    model: string;
  }): Promise<void>;
  failSession(learnerId: string, sessionId: string): Promise<void>;
  deleteSession(learnerId: string, sessionId: string): Promise<void>;
  recordUsage(input: ConversationUsageInput): Promise<void>;
}

export interface ConversationProviderResult<T> {
  payload: T;
  model: string;
  providerRequestId?: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface ConversationProvider {
  readonly configured: boolean;
  readonly model: string;
  continueConversation(input: {
    messages: AiPromptMessage[];
    jsonSchema: Record<string, unknown>;
  }): Promise<ConversationProviderResult<ConversationTurn>>;
  evaluateConversation(input: {
    messages: AiPromptMessage[];
    jsonSchema: Record<string, unknown>;
  }): Promise<ConversationProviderResult<ConversationFeedback>>;
}

export interface ConversationServiceContract {
  listScenarios(accessToken: string): Promise<ConversationScenarioListResponse>;
  listSessions(accessToken: string): Promise<ConversationListResponse>;
  getSession(accessToken: string, sessionId: string): Promise<ConversationDetailResponse>;
  createSession(
    accessToken: string,
    request: CreateConversationRequest,
  ): Promise<CreateConversationResponse>;
  sendMessage(
    accessToken: string,
    sessionId: string,
    request: SendConversationMessageRequest,
  ): Promise<SendConversationMessageResponse>;
  completeSession(
    accessToken: string,
    sessionId: string,
    request: CompleteConversationRequest,
  ): Promise<CompleteConversationResponse>;
  deleteSession(accessToken: string, sessionId: string): Promise<DeleteConversationResponse>;
}

export function toPromptHistory(session: ConversationSession): ConversationPromptMessage[] {
  return session.messages.map((message) => ({ role: message.role, content: message.content }));
}
