import { classroomTutorInstructionsV1, classroomTutorToolsV1 } from "@deutschtrainer/ai-prompts";
import { ApiError } from "../errors";
import type { CreateRealtimeCallInput, RealtimeCallProvider } from "./types";

interface OpenAiRealtimeProviderOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
  voice?: string;
}

export class OpenAiRealtimeProvider implements RealtimeCallProvider {
  readonly configured = true;

  constructor(private readonly options: OpenAiRealtimeProviderOptions) {}

  async createCall(input: CreateRealtimeCallInput): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const body = new FormData();
      body.set("sdp", input.sdp);
      body.set(
        "session",
        JSON.stringify({
          type: "realtime",
          model: this.options.model,
          instructions: classroomTutorInstructionsV1,
          audio: { output: { voice: this.options.voice ?? "marin" } },
          tools: classroomTutorToolsV1,
          tool_choice: "auto",
          max_output_tokens: 1024,
        }),
      );

      const response = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.options.apiKey}`,
          "OpenAI-Safety-Identifier": input.safetyIdentifier,
        },
        body,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw providerError();
      }
      const answer = await response.text();
      if (!answer.trim().startsWith("v=0")) {
        throw providerError();
      }
      return answer;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiError("CLASSROOM_PROVIDER_ERROR", "即時教室連線逾時，請稍後再試。", 504, true);
      }
      throw providerError();
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class UnavailableRealtimeProvider implements RealtimeCallProvider {
  readonly configured = false;

  async createCall(): Promise<string> {
    throw new ApiError("CLASSROOM_NOT_CONFIGURED", "即時教室尚未完成伺服器設定。", 503, false);
  }
}

function providerError(): ApiError {
  return new ApiError("CLASSROOM_PROVIDER_ERROR", "即時教室暫時無法建立連線。", 502, true);
}
