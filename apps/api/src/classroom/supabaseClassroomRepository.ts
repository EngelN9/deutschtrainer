import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { databaseError } from "../errors";
import type { ClassroomRepository, ClassroomSessionStart, ClassroomSessionRefusal } from "./types";

const startResultSchema = z.object({
  allowed: z.boolean(),
  expiresAt: z.string().optional(),
  reason: z.enum(["ACTIVE_SESSION", "DAILY_LIMIT", "GLOBAL_LIMIT"]).optional(),
  sessionId: z.string().uuid().optional(),
});

const endResultSchema = z.object({
  ended: z.boolean(),
  reason: z.string().optional(),
  userId: z.string().uuid().optional(),
});

const expiredRowSchema = z.object({ call_id: z.string().min(1) });

export class SupabaseClassroomRepository implements ClassroomRepository {
  private readonly client: SupabaseClient;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async startSession(input: {
    callId: string;
    dailyLimit: number;
    globalDailyLimit: number;
    maxSessionSeconds: number;
    safetyIdentifier: string;
    userId: string;
  }): Promise<ClassroomSessionStart> {
    const result = await this.client.rpc("start_classroom_session_service", {
      p_user_id: input.userId,
      p_call_id: input.callId,
      p_safety_identifier: input.safetyIdentifier,
      p_max_session_seconds: input.maxSessionSeconds,
      p_daily_limit: input.dailyLimit,
      p_global_daily_limit: input.globalDailyLimit,
    });
    if (result.error) {
      throw databaseError("無法建立即時教室工作階段。", result.error);
    }
    const parsed = startResultSchema.safeParse(result.data);
    if (!parsed.success) {
      throw databaseError("即時教室工作階段回應格式不正確。", result.error);
    }
    const refusal: ClassroomSessionRefusal | undefined = parsed.data.reason;
    return {
      allowed: parsed.data.allowed,
      ...(parsed.data.expiresAt === undefined ? {} : { expiresAt: parsed.data.expiresAt }),
      ...(refusal === undefined ? {} : { reason: refusal }),
      ...(parsed.data.sessionId === undefined ? {} : { sessionId: parsed.data.sessionId }),
    };
  }

  async endSession(callId: string, reason: string): Promise<boolean> {
    const result = await this.client.rpc("end_classroom_session_service", {
      p_call_id: callId,
      p_reason: reason,
    });
    if (result.error) {
      throw databaseError("無法結束即時教室工作階段。", result.error);
    }
    const parsed = endResultSchema.safeParse(result.data);
    return parsed.success ? parsed.data.ended : false;
  }

  async findActiveCallId(userId: string): Promise<string | undefined> {
    const result = await this.client
      .from("classroom_sessions")
      .select("call_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (result.error) {
      throw databaseError("無法查詢進行中的即時教室工作階段。", result.error);
    }
    const parsed = expiredRowSchema.safeParse(result.data);
    return parsed.success ? parsed.data.call_id : undefined;
  }

  async listExpiredCallIds(): Promise<string[]> {
    const result = await this.client.rpc("list_expired_classroom_sessions_service");
    if (result.error) {
      throw databaseError("無法取得逾時的即時教室工作階段。", result.error);
    }
    const parsed = z.array(expiredRowSchema).safeParse(result.data ?? []);
    return parsed.success ? parsed.data.map((row) => row.call_id) : [];
  }
}
