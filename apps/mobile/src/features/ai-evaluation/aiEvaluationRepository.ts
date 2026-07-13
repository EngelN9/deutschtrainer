import type { Attempt } from "@deutschtrainer/shared-types";
import {
  apiErrorResponseSchema,
  evaluateResponseResponseSchema,
  type EvaluateResponseRequest,
  type EvaluateResponseResponse,
} from "@deutschtrainer/validation";
import { mobileEnv } from "../../lib/env";
import { supabase } from "../../lib/supabase";

export interface SubmitAiEvaluationInput {
  exerciseId: string;
  responseDe: string;
  durationMs: number;
  usedHint: boolean;
  mode: Attempt["mode"];
  idempotencyKey: string;
  reviewId?: string;
}

export async function submitAiEvaluation(
  input: SubmitAiEvaluationInput,
): Promise<EvaluateResponseResponse> {
  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error || !sessionResult.data.session?.access_token) {
    throw new Error("登入狀態已失效，請重新登入。");
  }

  const request: EvaluateResponseRequest = {
    exerciseId: input.exerciseId,
    responseDe: input.responseDe,
    durationMs: input.durationMs,
    usedHint: input.usedHint,
    mode: input.mode,
    idempotencyKey: input.idempotencyKey,
    ...(input.reviewId ? { reviewId: input.reviewId } : {}),
  };
  let response: Response;
  try {
    response = await fetch(`${mobileEnv.apiBaseUrl.replace(/\/$/, "")}/ai/evaluate-response`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${sessionResult.data.session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error("無法連線至 AI 批改服務，請檢查網路後重試。");
  }

  const payload = await readJson(response);
  if (!response.ok) {
    const errorResult = apiErrorResponseSchema.safeParse(payload);
    throw new Error(
      errorResult.success ? errorResult.data.error.message : "AI 批改服務暫時無法使用。",
    );
  }

  const parsed = evaluateResponseResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("AI 批改回傳格式不完整，請稍後重試。");
  }
  return parsed.data;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}
