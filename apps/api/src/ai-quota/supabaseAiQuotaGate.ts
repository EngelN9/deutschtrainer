import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ApiError } from "../errors";
import type { AiQuotaFeature, AiQuotaGate, AiQuotaLearner, AiQuotaReservation } from "./types";

const reservationResultSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
  reservationId: z.string().uuid().optional(),
  generation: z.number().int().positive().optional(),
});

const providerCallResultSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
});

interface SupabaseAiQuotaGateOptions {
  globalDailyProviderCallLimit: number;
  publicEnabled: boolean;
}

export class SupabaseAiQuotaGate implements AiQuotaGate {
  private readonly client: SupabaseClient;

  constructor(
    supabaseUrl: string,
    serviceRoleKey: string,
    private readonly options: SupabaseAiQuotaGateOptions,
  ) {
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  assertEligible(learner: AiQuotaLearner): void {
    if (!this.options.publicEnabled) {
      throw new ApiError("AI_GLOBALLY_DISABLED", "公開 AI 服務目前尚未啟用。", 503, false);
    }
    if (learner.role !== "learner") {
      throw new ApiError("FORBIDDEN", "免費 AI 額度僅供有效學習者帳號使用。", 403, false);
    }
    if (!learner.emailVerified) {
      throw new ApiError("FORBIDDEN", "請先完成 Email 驗證後再使用 AI 功能。", 403, false);
    }
  }

  async reserve(input: {
    feature: AiQuotaFeature;
    idempotencyKey: string;
    learnerId: string;
    limit: number;
  }): Promise<AiQuotaReservation> {
    const result = await this.client.rpc("reserve_ai_quota_service", {
      p_user_id: input.learnerId,
      p_feature: input.feature,
      p_idempotency_key: input.idempotencyKey,
      p_user_limit: input.limit,
    });
    assertDatabaseResult(result.error, "無法保留 AI 使用額度。");
    const parsed = reservationResultSchema.safeParse(result.data);
    if (!parsed.success) {
      throw new ApiError("DATABASE_ERROR", "AI 額度回應格式不正確。", 500, true);
    }
    if (!parsed.data.allowed) {
      if (parsed.data.reason === "USER_LIMIT") {
        throw new ApiError(
          "AI_QUOTA_EXCEEDED",
          `過去 24 小時的 AI 使用額度已用完（${input.limit} 次）。`,
          429,
          true,
        );
      }
      throw new ApiError("CONFLICT", "相同的 AI 要求正在處理或已完成。", 409, true);
    }
    if (!parsed.data.reservationId || !parsed.data.generation) {
      throw new ApiError("DATABASE_ERROR", "AI 額度保留資料不完整。", 500, true);
    }
    return { id: parsed.data.reservationId, generation: parsed.data.generation };
  }

  async reserveProviderCall(
    reservation: AiQuotaReservation,
    providerAttempt: number,
  ): Promise<void> {
    const result = await this.client.rpc("reserve_ai_provider_call_service", {
      p_reservation_id: reservation.id,
      p_generation: reservation.generation,
      p_provider_attempt: providerAttempt,
      p_global_limit: this.options.globalDailyProviderCallLimit,
    });
    assertDatabaseResult(result.error, "無法保留 AI provider 呼叫額度。");
    const parsed = providerCallResultSchema.safeParse(result.data);
    if (!parsed.success) {
      throw new ApiError("DATABASE_ERROR", "AI provider 額度回應格式不正確。", 500, true);
    }
    if (!parsed.data.allowed) {
      if (parsed.data.reason === "GLOBAL_LIMIT") {
        throw new ApiError(
          "AI_QUOTA_EXCEEDED",
          "今日平台 AI 服務額度已達上限，請稍後再試。",
          429,
          true,
        );
      }
      throw new ApiError("CONFLICT", "相同的 AI provider 要求正在處理。", 409, true);
    }
  }

  async consume(reservation: AiQuotaReservation): Promise<void> {
    await this.finalize(reservation, "consumed");
  }

  async release(reservation: AiQuotaReservation): Promise<void> {
    await this.finalize(reservation, "released");
  }

  private async finalize(
    reservation: AiQuotaReservation,
    outcome: "consumed" | "released",
  ): Promise<void> {
    const result = await this.client.rpc("finalize_ai_quota_service", {
      p_reservation_id: reservation.id,
      p_generation: reservation.generation,
      p_outcome: outcome,
    });
    assertDatabaseResult(result.error, "無法更新 AI 使用額度。");
  }
}

function assertDatabaseResult(
  error: { code?: string; message?: string } | null,
  message: string,
): void {
  if (!error) {
    return;
  }
  if (error.code === "22023") {
    throw new ApiError("VALIDATION_ERROR", message, 400, false);
  }
  if (error.code === "42501") {
    throw new ApiError("FORBIDDEN", message, 403, false);
  }
  throw new ApiError("DATABASE_ERROR", message, 500, true);
}
