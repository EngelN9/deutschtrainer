import { classroomTutorInstructionsV1, classroomTutorToolsV1 } from "@deutschtrainer/ai-prompts";
import { ApiError } from "../errors";
import type { CreateRealtimeCallInput, RealtimeCall, RealtimeCallProvider } from "./types";

interface OpenAiRealtimeProviderOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
  voice?: string;
}

export class OpenAiRealtimeProvider implements RealtimeCallProvider {
  readonly configured = true;

  constructor(private readonly options: OpenAiRealtimeProviderOptions) {}

  async createCall(input: CreateRealtimeCallInput): Promise<RealtimeCall> {
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
        // The client response stays deliberately vague, but a 502 with no server-side detail is
        // undiagnosable. OpenAI error bodies carry only message/type/code, never credentials.
        logProviderFailure("http_status", {
          status: response.status,
          body: (await response.text().catch(() => "")).slice(0, 500),
        });
        throw providerError();
      }
      // The Location header carries the call id. Without it the server can never end this call,
      // so treat a missing one as a provider failure rather than starting an unstoppable session.
      const callId = readCallId(response.headers.get("location"));
      if (!callId) {
        logProviderFailure("missing_call_id", { location: response.headers.get("location") });
        throw providerError();
      }
      const answer = await response.text();
      if (!answer.trim().startsWith("v=0")) {
        logProviderFailure("malformed_sdp_answer", { answerPrefix: answer.slice(0, 200) });
        throw providerError();
      }
      return { callId, sdp: answer };
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

  /**
   * End an active call at the provider. This is the only control that survives a closed laptop,
   * a killed tab, or a client that never reports back, so it never throws — a failure here must
   * not stop the sweeper from working through the rest of the expired sessions.
   */
  async hangup(callId: string): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await fetch(
        `https://api.openai.com/v1/realtime/calls/${encodeURIComponent(callId)}/hangup`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${this.options.apiKey}` },
          signal: controller.signal,
        },
      );
      // 404 means the call already ended on its own; that is a success for our purposes.
      return response.ok || response.status === 404;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class UnavailableRealtimeProvider implements RealtimeCallProvider {
  readonly configured = false;

  async createCall(): Promise<RealtimeCall> {
    throw new ApiError("CLASSROOM_NOT_CONFIGURED", "即時教室尚未完成伺服器設定。", 503, false);
  }

  async hangup(): Promise<boolean> {
    return false;
  }
}

/**
 * The Location header is either a bare call id or a URL ending in one. Accept both, and keep only
 * the final path segment so a full URL cannot be interpolated into the hangup path.
 */
export function readCallId(location: string | null): string | undefined {
  if (!location) return undefined;
  const trimmed = location.trim().replace(/[/\s]+$/u, "");
  const segment = trimmed.slice(trimmed.lastIndexOf("/") + 1);
  return /^[A-Za-z0-9_-]{1,200}$/u.test(segment) ? segment : undefined;
}

/**
 * Records why a call could not be established. The learner-facing error stays generic on purpose;
 * this is the only place the actual provider response is visible to an operator.
 */
function logProviderFailure(reason: string, detail: Record<string, unknown>): void {
  console.error(
    JSON.stringify({ level: "error", event: "classroom_provider_call_failed", reason, ...detail }),
  );
}

function providerError(): ApiError {
  return new ApiError("CLASSROOM_PROVIDER_ERROR", "即時教室暫時無法建立連線。", 502, true);
}
