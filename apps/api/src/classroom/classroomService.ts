import { createHmac } from "node:crypto";
import { ApiError } from "../errors";
import type {
  ClassroomAuthenticator,
  ClassroomLearner,
  ClassroomRepository,
  ClassroomServiceContract,
  ClassroomSessionRefusal,
  RealtimeCallProvider,
} from "./types";

interface ClassroomServiceOptions {
  allowedProfileIds: ReadonlySet<string>;
  authenticator: ClassroomAuthenticator;
  dailySessionLimit: number;
  enabled: boolean;
  globalDailySessionLimit: number;
  maxSessionSeconds: number;
  provider: RealtimeCallProvider;
  repository: ClassroomRepository;
  safetyIdentifierSalt: string;
}

const REFUSAL_MESSAGES: Record<ClassroomSessionRefusal, string> = {
  ACTIVE_SESSION: "你已經有一個進行中的教室連線，請先結束後再開始新的課程。",
  DAILY_LIMIT: "過去 24 小時的教室課程額度已用完，請明天再試。",
  GLOBAL_LIMIT: "今日教室課程總額度已用完，請明天再試。",
};

export class ClassroomService implements ClassroomServiceContract {
  constructor(private readonly options: ClassroomServiceOptions) {}

  async createRealtimeCall(accessToken: string, sdp: string): Promise<string> {
    const learner = await this.authorize(accessToken);
    const safetyIdentifier = createSafetyIdentifier(
      learner.profileId,
      this.options.safetyIdentifierSalt,
    );

    const call = await this.options.provider.createCall({ sdp, safetyIdentifier });

    // The session row is what makes the call stoppable, so if it cannot be written — a concurrent
    // session, an exhausted budget, or a database failure — the call is hung up immediately rather
    // than left running unattended on the server's key.
    let started;
    try {
      started = await this.options.repository.startSession({
        callId: call.callId,
        dailyLimit: this.options.dailySessionLimit,
        globalDailyLimit: this.options.globalDailySessionLimit,
        maxSessionSeconds: this.options.maxSessionSeconds,
        safetyIdentifier,
        userId: learner.profileId,
      });
    } catch (error) {
      await this.options.provider.hangup(call.callId);
      throw error;
    }

    if (!started.allowed) {
      await this.options.provider.hangup(call.callId);
      const reason = started.reason ?? "ACTIVE_SESSION";
      throw new ApiError("CLASSROOM_SESSION_LIMIT", REFUSAL_MESSAGES[reason], 429, true);
    }

    return call.sdp;
  }

  async endActiveSession(accessToken: string): Promise<boolean> {
    const learner = await this.authorize(accessToken);
    const callId = await this.options.repository.findActiveCallId(learner.profileId);
    if (!callId) return false;
    // Hang up before closing the row. If this process dies in between, the row stays active and
    // the sweeper ends the call at its expiry — the failure mode costs minutes, not a session.
    await this.options.provider.hangup(callId);
    return this.options.repository.endSession(callId, "client_ended");
  }

  /**
   * Ends every session past its server-side budget. Runs on an interval and once at boot, so a
   * deploy or a crash cannot orphan a live call.
   */
  async sweepExpiredSessions(): Promise<number> {
    if (!this.options.enabled) return 0;
    const callIds = await this.options.repository.listExpiredCallIds();
    let ended = 0;
    for (const callId of callIds) {
      // hangup never throws; close the row either way so a permanently unreachable call cannot
      // wedge the sweeper into retrying it forever.
      await this.options.provider.hangup(callId);
      await this.options.repository.endSession(callId, "expired");
      ended += 1;
    }
    return ended;
  }

  private async authorize(accessToken: string): Promise<ClassroomLearner> {
    if (!this.options.enabled) {
      throw new ApiError("CLASSROOM_DISABLED", "即時教室目前尚未啟用。", 503, false);
    }
    if (!this.options.provider.configured || !this.options.safetyIdentifierSalt) {
      throw new ApiError("CLASSROOM_NOT_CONFIGURED", "即時教室尚未完成伺服器設定。", 503, false);
    }

    const learner = await this.options.authenticator.authenticate(accessToken);
    if (!learner) {
      throw new ApiError("UNAUTHORIZED", "請先登入再使用即時教室。", 401, false);
    }
    if (learner.role !== "learner") {
      throw new ApiError("FORBIDDEN", "即時教室僅供學習者帳號使用。", 403, false);
    }
    if (!learner.emailVerified) {
      throw new ApiError("FORBIDDEN", "請先完成 Email 驗證後再使用即時教室。", 403, false);
    }
    if (!this.options.allowedProfileIds.has(learner.profileId)) {
      throw new ApiError(
        "CLASSROOM_ACCESS_RESTRICTED",
        "即時教室目前只開放給內部測試帳號。",
        403,
        false,
      );
    }
    return learner;
  }
}

export function createSafetyIdentifier(profileId: string, salt: string): string {
  return `dt_${createHmac("sha256", salt).update(profileId).digest("hex")}`;
}
