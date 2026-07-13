import OpenAI from "openai";
import type { WritingFeedback } from "@deutschtrainer/ai-schemas";
import type { ErrorType } from "@deutschtrainer/shared-types";
import type { ProviderWritingInput, ProviderWritingResult, WritingProvider } from "./types";

export type WritingProviderErrorCode =
  "AI_NOT_CONFIGURED" | "AI_TIMEOUT" | "AI_RESPONSE_INVALID" | "NETWORK_ERROR" | "RATE_LIMITED";

export class WritingProviderError extends Error {
  constructor(
    readonly code: WritingProviderErrorCode,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "WritingProviderError";
  }
}

export interface OpenAiWritingProviderOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export class OpenAiWritingProvider implements WritingProvider {
  readonly configured = true;
  readonly model: string;
  private readonly client: OpenAI;

  constructor(options: OpenAiWritingProviderOptions) {
    this.model = options.model;
    this.client = new OpenAI({
      apiKey: options.apiKey,
      maxRetries: 0,
      timeout: options.timeoutMs,
    });
  }

  async evaluate(input: ProviderWritingInput): Promise<ProviderWritingResult> {
    const startedAt = Date.now();

    try {
      const response = await this.client.responses.create({
        model: this.model,
        input: input.messages,
        max_output_tokens: 4_000,
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: "writing_feedback",
            description: "Rubric and inline feedback for a German writing submission.",
            schema: input.jsonSchema,
            strict: true,
          },
        },
      });
      const outputText = response.output_text?.trim();
      if (!outputText) {
        throw new WritingProviderError(
          "AI_RESPONSE_INVALID",
          "OpenAI 沒有回傳可解析的作文回饋。",
          true,
        );
      }

      let payload: unknown;
      try {
        payload = JSON.parse(outputText) as unknown;
      } catch {
        throw new WritingProviderError(
          "AI_RESPONSE_INVALID",
          "OpenAI 回傳的作文回饋不是有效 JSON。",
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
      if (error instanceof WritingProviderError) {
        throw error;
      }
      throw classifyOpenAiError(error);
    }
  }
}

export class UnavailableWritingProvider implements WritingProvider {
  readonly configured = false;

  constructor(readonly model: string) {}

  async evaluate(): Promise<ProviderWritingResult> {
    throw new WritingProviderError("AI_NOT_CONFIGURED", "伺服器尚未設定 OpenAI API 金鑰。", true);
  }
}

export class DeterministicWritingProvider implements WritingProvider {
  readonly configured = true;
  readonly model = "local-writing-fixture";

  async evaluate(input: ProviderWritingInput): Promise<ProviderWritingResult> {
    const text = input.learnerTextDe;
    const wrongPhrase = "weil ich muss arbeiten";
    const startOffset = text.indexOf(wrongPhrase);
    const hasWordOrderError = startOffset >= 0;
    const errorTypes: ErrorType[] = hasWordOrderError ? ["word_order"] : [];
    const score = hasWordOrderError ? 62 : input.versionNumber >= 2 ? 88 : 84;
    const feedback: WritingFeedback = {
      score,
      cefrLevelEstimate: input.prompt.level,
      rubricScores: {
        taskCompletion: hasWordOrderError ? 70 : 90,
        grammar: hasWordOrderError ? 48 : 88,
        vocabulary: hasWordOrderError ? 68 : 86,
        coherence: hasWordOrderError ? 65 : 88,
        cohesion: hasWordOrderError ? 62 : 86,
        register: hasWordOrderError ? 66 : 90,
        argumentation: hasWordOrderError ? 60 : 84,
        style: hasWordOrderError ? 62 : 86,
        accuracy: hasWordOrderError ? 50 : 90,
        idiomaticity: hasWordOrderError ? 58 : 84,
      },
      inlineErrors: hasWordOrderError
        ? [
            {
              type: "word_order",
              severity: "major",
              original: wrongPhrase,
              correction: "weil ich arbeiten muss",
              explanationZhTw: "weil 引導從句時，變位動詞 muss 應放在句尾。",
              relatedSkillId: input.prompt.skillIds[0] ?? `${input.prompt.level}.writing`,
              grammarTopicId: null,
              vocabularyId: null,
              startOffset,
              endOffset: startOffset + wrongPhrase.length,
            },
          ]
        : [],
      strengths: hasWordOrderError
        ? ["已清楚交代寫信目的，內容具備基本結構。"]
        : ["任務回應完整，語序與正式語域都比前一版穩定。"],
      revisionTasks: hasWordOrderError
        ? ["修正 weil 從句的動詞位置。", "逐項確認題目要求都有具體回應。"]
        : ["再檢查標點與段落銜接，保留目前清楚的正式語氣。"],
      referenceVersion: input.versionNumber >= 2 ? input.prompt.referenceVersionDe : null,
      repeatedErrorTypes: errorTypes.filter((type) => input.previousErrorTypes.includes(type)),
      requiresHumanReview: false,
    };

    return {
      payload: feedback,
      model: this.model,
      providerRequestId: `writing-fixture-${Date.now()}`,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 5,
    };
  }
}

function classifyOpenAiError(error: unknown): WritingProviderError {
  const status = readNumberProperty(error, "status");
  const name = readStringProperty(error, "name");

  if (status === 429) {
    return new WritingProviderError("RATE_LIMITED", "OpenAI 暫時限制呼叫頻率。", true);
  }
  if (name.includes("Timeout") || name.includes("Abort")) {
    return new WritingProviderError("AI_TIMEOUT", "AI 作文批改逾時。", true);
  }
  if (status !== undefined && status >= 400 && status < 500) {
    return new WritingProviderError(
      "NETWORK_ERROR",
      "OpenAI 拒絕了作文批改要求，請檢查伺服器設定。",
      false,
    );
  }
  return new WritingProviderError("NETWORK_ERROR", "無法連線至 AI 作文批改服務。", true);
}

function readNumberProperty(value: unknown, key: string): number | undefined {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return undefined;
  }
  const property = (value as Record<string, unknown>)[key];
  return typeof property === "number" ? property : undefined;
}

function readStringProperty(value: unknown, key: string): string {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return "";
  }
  const property = (value as Record<string, unknown>)[key];
  return typeof property === "string" ? property : "";
}
