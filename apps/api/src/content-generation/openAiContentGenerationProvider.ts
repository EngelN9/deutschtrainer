import OpenAI from "openai";
import type { GeneratedExerciseDraft } from "@deutschtrainer/ai-schemas";
import type {
  ContentGenerationProvider,
  ProviderGenerationInput,
  ProviderGenerationResult,
} from "./types";

export type ContentGenerationProviderErrorCode =
  "AI_NOT_CONFIGURED" | "AI_TIMEOUT" | "AI_RESPONSE_INVALID" | "NETWORK_ERROR" | "RATE_LIMITED";

export class ContentGenerationProviderError extends Error {
  constructor(
    readonly code: ContentGenerationProviderErrorCode,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ContentGenerationProviderError";
  }
}

export class OpenAiContentGenerationProvider implements ContentGenerationProvider {
  readonly configured = true;
  readonly model: string;
  private readonly client: OpenAI;

  constructor(options: { apiKey: string; model: string; timeoutMs: number }) {
    this.model = options.model;
    this.client = new OpenAI({
      apiKey: options.apiKey,
      maxRetries: 0,
      timeout: options.timeoutMs,
    });
  }

  async generate(input: ProviderGenerationInput): Promise<ProviderGenerationResult> {
    const startedAt = Date.now();
    try {
      const response = await this.client.responses.create({
        model: this.model,
        input: input.messages,
        max_output_tokens: 1_600,
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: "generated_exercise_draft",
            description: "A German exercise draft that always requires editorial review.",
            schema: input.jsonSchema,
            strict: true,
          },
        },
      });
      const outputText = response.output_text?.trim();
      if (!outputText) {
        throw new ContentGenerationProviderError(
          "AI_RESPONSE_INVALID",
          "OpenAI 沒有回傳可解析的題目草稿。",
          true,
        );
      }

      let payload: unknown;
      try {
        payload = JSON.parse(outputText) as unknown;
      } catch {
        throw new ContentGenerationProviderError(
          "AI_RESPONSE_INVALID",
          "OpenAI 回傳的題目草稿不是有效 JSON。",
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
      if (error instanceof ContentGenerationProviderError) {
        throw error;
      }
      throw classifyOpenAiError(error);
    }
  }
}

export class UnavailableContentGenerationProvider implements ContentGenerationProvider {
  readonly configured = false;

  constructor(readonly model: string) {}

  async generate(): Promise<ProviderGenerationResult> {
    throw new ContentGenerationProviderError(
      "AI_NOT_CONFIGURED",
      "伺服器尚未設定 OpenAI API 金鑰。",
      false,
    );
  }
}

export class DeterministicContentGenerationProvider implements ContentGenerationProvider {
  readonly configured = true;
  readonly model = "local-content-generation-fixture";

  async generate(input: ProviderGenerationInput): Promise<ProviderGenerationResult> {
    const common = {
      type: input.request.type,
      titleZhTw: `${input.request.level} ${input.request.topicZhTw}`,
      instructionZhTw: "請依題意選擇或填入正確的德語答案。",
      estimatedSeconds: 60,
      difficulty: 3,
      validationNotes: ["此內容由本機固定 provider 產生，仍須人工審核。"],
      requiresHumanReview: true as const,
    };

    let payload: GeneratedExerciseDraft;
    if (input.request.type === "multiple_choice") {
      payload = {
        ...common,
        type: "multiple_choice",
        promptDe: "Welche Formulierung ist in einem formellen Kontext angemessen?",
        options: [
          {
            label: "A",
            textDe: "Könnten Sie mir bitte nähere Informationen zusenden?",
            textZhTw: "您可以寄給我更詳細的資訊嗎？",
            isCorrect: true,
          },
          {
            label: "B",
            textDe: "Schick mir sofort alle Infos.",
            textZhTw: "立刻把所有資訊寄給我。",
            isCorrect: false,
          },
        ],
        acceptedAnswers: [],
        explanationZhTw: null,
      };
    } else if (input.request.type === "fill_blank") {
      payload = {
        ...common,
        type: "fill_blank",
        promptDe: "Ich interessiere mich ___ die ausgeschriebene Stelle.",
        options: [],
        acceptedAnswers: ["für"],
        explanationZhTw: "sich interessieren 固定搭配 für 加第四格。",
      };
    } else {
      payload = {
        ...common,
        type: "error_correction",
        promptDe: "Obwohl er ist müde, arbeitet er weiter.",
        options: [],
        acceptedAnswers: ["Obwohl er müde ist, arbeitet er weiter."],
        explanationZhTw: "obwohl 引導從句時，變位動詞 ist 應放在從句句尾。",
      };
    }

    return {
      payload,
      model: this.model,
      providerRequestId: `fixture-${Date.now()}`,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 5,
    };
  }
}

function classifyOpenAiError(error: unknown): ContentGenerationProviderError {
  const status = readNumberProperty(error, "status");
  const name = readStringProperty(error, "name");
  if (status === 429) {
    return new ContentGenerationProviderError("RATE_LIMITED", "OpenAI 暫時限制呼叫頻率。", true);
  }
  if (name.includes("Timeout") || name.includes("Abort")) {
    return new ContentGenerationProviderError("AI_TIMEOUT", "AI 題目生成逾時。", true);
  }
  if (status !== undefined && status >= 400 && status < 500) {
    return new ContentGenerationProviderError(
      "NETWORK_ERROR",
      "OpenAI 拒絕了題目生成要求，請檢查伺服器設定。",
      false,
    );
  }
  return new ContentGenerationProviderError("NETWORK_ERROR", "無法連線至 AI 題目生成服務。", true);
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
