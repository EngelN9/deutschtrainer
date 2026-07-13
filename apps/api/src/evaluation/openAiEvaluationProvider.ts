import OpenAI from "openai";
import type { AiEvaluationFeedback } from "@deutschtrainer/ai-schemas";
import type {
  EvaluationProvider,
  ProviderEvaluationInput,
  ProviderEvaluationResult,
} from "./types";

export type ProviderErrorCode =
  "AI_NOT_CONFIGURED" | "AI_TIMEOUT" | "AI_RESPONSE_INVALID" | "NETWORK_ERROR" | "RATE_LIMITED";

export class EvaluationProviderError extends Error {
  constructor(
    readonly code: ProviderErrorCode,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "EvaluationProviderError";
  }
}

export interface OpenAiEvaluationProviderOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export class OpenAiEvaluationProvider implements EvaluationProvider {
  readonly configured = true;
  readonly model: string;
  private readonly client: OpenAI;

  constructor(options: OpenAiEvaluationProviderOptions) {
    this.model = options.model;
    this.client = new OpenAI({
      apiKey: options.apiKey,
      maxRetries: 0,
      timeout: options.timeoutMs,
    });
  }

  async evaluate(input: ProviderEvaluationInput): Promise<ProviderEvaluationResult> {
    const startedAt = Date.now();

    try {
      const response = await this.client.responses.create({
        model: this.model,
        input: input.messages,
        max_output_tokens: 1_400,
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: "ai_evaluation_feedback",
            description: "Structured CEFR feedback for a German learner response.",
            schema: input.jsonSchema,
            strict: true,
          },
        },
      });
      const outputText = response.output_text?.trim();

      if (!outputText) {
        throw new EvaluationProviderError(
          "AI_RESPONSE_INVALID",
          "OpenAI 沒有回傳可解析的批改內容。",
          true,
        );
      }

      let payload: unknown;
      try {
        payload = JSON.parse(outputText) as unknown;
      } catch {
        throw new EvaluationProviderError(
          "AI_RESPONSE_INVALID",
          "OpenAI 回傳內容不是有效 JSON。",
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
      if (error instanceof EvaluationProviderError) {
        throw error;
      }

      throw classifyOpenAiError(error);
    }
  }
}

export class UnavailableEvaluationProvider implements EvaluationProvider {
  readonly configured = false;

  constructor(readonly model: string) {}

  async evaluate(): Promise<ProviderEvaluationResult> {
    throw new EvaluationProviderError(
      "AI_NOT_CONFIGURED",
      "伺服器尚未設定 OpenAI API 金鑰。",
      true,
    );
  }
}

export class DeterministicEvaluationProvider implements EvaluationProvider {
  readonly configured = true;
  readonly model = "local-evaluation-fixture";

  async evaluate(input: ProviderEvaluationInput): Promise<ProviderEvaluationResult> {
    const response = input.learnerResponseDe.trim();
    const obviousWordOrderError =
      /\b(weil|obwohl)\b.*\b(ich|er|sie|es|wir)\b\s+\w+\s+(muss|ist|hat)\b/i.test(response);
    const isCorrect = response.length >= input.exercise.minimumCharacters && !obviousWordOrderError;
    const firstSkill = input.exercise.skillIds[0] ?? `${input.exercise.level}.task_completion`;
    const referenceAnswer = input.exercise.referenceAnswersDe[0] ?? response;
    const naturalAlternative = input.exercise.referenceAnswersDe[1] ?? referenceAnswer;
    const feedback: AiEvaluationFeedback = {
      isCorrect,
      score: isCorrect ? 88 : 58,
      cefrLevelEstimate: input.exercise.level,
      correctedText: isCorrect ? response : referenceAnswer,
      errors: isCorrect
        ? []
        : [
            {
              type: obviousWordOrderError ? "word_order" : "task_completion",
              severity: "major",
              original: response,
              correction: referenceAnswer,
              explanationZhTw: obviousWordOrderError
                ? "weil 引導從句時，變位動詞應放在句尾。"
                : "回答需要更完整地回應題目，並補上清楚的理由。",
              relatedSkillId: firstSkill,
              grammarTopicId: null,
              vocabularyId: null,
            },
          ],
      strengths: isCorrect ? ["回答完整，語意清楚。"] : ["已嘗試使用德語表達主要意思。"],
      suggestions: isCorrect
        ? ["可再加入一個細節，使表達更自然。"]
        : ["先寫出主句，再檢查從句中的變位動詞位置。"],
      naturalAlternative: isCorrect ? response : naturalAlternative,
      requiresHumanReview: false,
    };

    return {
      payload: feedback,
      model: this.model,
      providerRequestId: `fixture-${Date.now()}`,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 5,
    };
  }
}

function classifyOpenAiError(error: unknown): EvaluationProviderError {
  const status = readNumberProperty(error, "status");
  const name = readStringProperty(error, "name");

  if (status === 429) {
    return new EvaluationProviderError("RATE_LIMITED", "OpenAI 暫時限制呼叫頻率。", true);
  }

  if (name.includes("Timeout") || name.includes("Abort")) {
    return new EvaluationProviderError("AI_TIMEOUT", "AI 批改逾時。", true);
  }

  if (status !== undefined && status >= 400 && status < 500) {
    return new EvaluationProviderError(
      "NETWORK_ERROR",
      "OpenAI 拒絕了批改要求，請檢查伺服器設定。",
      false,
    );
  }

  return new EvaluationProviderError("NETWORK_ERROR", "無法連線至 AI 批改服務。", true);
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
