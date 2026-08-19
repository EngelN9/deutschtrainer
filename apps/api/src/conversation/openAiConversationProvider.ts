import OpenAI from "openai";
import {
  conversationFeedbackSchema,
  conversationTurnSchema,
  type ConversationFeedback,
  type ConversationTurn,
} from "@deutschtrainer/ai-schemas";
import type { AiPromptMessage } from "@deutschtrainer/ai-prompts";
import type { ConversationProvider, ConversationProviderResult } from "./types";

export type ConversationProviderErrorCode =
  "AI_NOT_CONFIGURED" | "AI_TIMEOUT" | "AI_RESPONSE_INVALID" | "NETWORK_ERROR" | "RATE_LIMITED";

export class ConversationProviderError extends Error {
  constructor(
    readonly code: ConversationProviderErrorCode,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ConversationProviderError";
  }
}

export class OpenAiConversationProvider implements ConversationProvider {
  readonly configured = true;
  readonly model: string;
  private readonly client: OpenAI;

  constructor(options: { apiKey: string; model: string; timeoutMs: number }) {
    this.model = options.model;
    this.client = new OpenAI({ apiKey: options.apiKey, maxRetries: 0, timeout: options.timeoutMs });
  }

  continueConversation(input: {
    messages: AiPromptMessage[];
    jsonSchema: Record<string, unknown>;
  }) {
    return this.request("conversation_turn", input, conversationTurnSchema.parse);
  }

  evaluateConversation(input: {
    messages: AiPromptMessage[];
    jsonSchema: Record<string, unknown>;
  }) {
    return this.request("conversation_feedback", input, conversationFeedbackSchema.parse);
  }

  private async request<T>(
    schemaName: string,
    input: { messages: AiPromptMessage[]; jsonSchema: Record<string, unknown> },
    parse: (value: unknown) => T,
  ): Promise<ConversationProviderResult<T>> {
    const startedAt = Date.now();
    try {
      const response = await this.client.responses.create({
        model: this.model,
        input: input.messages,
        max_output_tokens: 2_000,
        store: false,
        text: {
          format: { type: "json_schema", name: schemaName, schema: input.jsonSchema, strict: true },
        },
      });
      if (!response.output_text?.trim()) {
        throw new ConversationProviderError(
          "AI_RESPONSE_INVALID",
          "AI 對話沒有回傳有效內容。",
          true,
        );
      }
      let decoded: unknown;
      try {
        decoded = JSON.parse(response.output_text) as unknown;
      } catch {
        throw new ConversationProviderError(
          "AI_RESPONSE_INVALID",
          "AI 對話回應不是有效 JSON。",
          true,
        );
      }
      let payload: T;
      try {
        payload = parse(decoded);
      } catch {
        throw new ConversationProviderError(
          "AI_RESPONSE_INVALID",
          "AI 對話回應不符合安全格式。",
          true,
        );
      }
      return {
        payload,
        model: response.model ?? this.model,
        providerRequestId: response.id,
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        latencyMs: Math.max(0, Date.now() - startedAt),
      };
    } catch (error) {
      if (error instanceof ConversationProviderError) throw error;
      throw classifyProviderError(error);
    }
  }
}

export class UnavailableConversationProvider implements ConversationProvider {
  readonly configured = false;
  constructor(readonly model: string) {}
  async continueConversation(): Promise<ConversationProviderResult<ConversationTurn>> {
    throw new ConversationProviderError("AI_NOT_CONFIGURED", "伺服器尚未設定 AI 對話服務。", false);
  }
  async evaluateConversation(): Promise<ConversationProviderResult<ConversationFeedback>> {
    throw new ConversationProviderError("AI_NOT_CONFIGURED", "伺服器尚未設定 AI 對話服務。", false);
  }
}

export class DeterministicConversationProvider implements ConversationProvider {
  readonly configured = true;
  readonly model = "local-conversation-fixture";
  async continueConversation(): Promise<ConversationProviderResult<ConversationTurn>> {
    return result(
      { replyDe: "Danke. Welche Lösung würden Sie konkret vorschlagen?", suggestCompletion: false },
      this.model,
    );
  }
  async evaluateConversation(): Promise<ConversationProviderResult<ConversationFeedback>> {
    return result(
      {
        summaryZhTw: "你已完成本機固定對話流程；此結果只供測試。",
        strengths: ["能以完整句子回應對方。"],
        priorityIssues: [],
        retryTaskZhTw: "下次加入一個理由與具體例子。",
        requiresHumanReview: false,
      },
      this.model,
    );
  }
}

function result<T>(payload: T, model: string): ConversationProviderResult<T> {
  return { payload, model, inputTokens: 0, outputTokens: 0, latencyMs: 1 };
}

function classifyProviderError(error: unknown): ConversationProviderError {
  const record =
    typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
  if (record.status === 429) {
    return new ConversationProviderError("RATE_LIMITED", "AI 對話暫時受到流量限制。", true);
  }
  const name = typeof record.name === "string" ? record.name : "";
  if (name.includes("Timeout") || name.includes("Abort")) {
    return new ConversationProviderError("AI_TIMEOUT", "AI 對話逾時，請稍後再試。", true);
  }
  return new ConversationProviderError("NETWORK_ERROR", "目前無法連線至 AI 對話服務。", true);
}
