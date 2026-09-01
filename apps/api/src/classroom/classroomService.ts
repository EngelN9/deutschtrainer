import { createHmac } from "node:crypto";
import { ApiError } from "../errors";
import type {
  ClassroomAuthenticator,
  ClassroomServiceContract,
  RealtimeCallProvider,
} from "./types";

interface ClassroomServiceOptions {
  allowedProfileIds: ReadonlySet<string>;
  authenticator: ClassroomAuthenticator;
  enabled: boolean;
  provider: RealtimeCallProvider;
  safetyIdentifierSalt: string;
}

export class ClassroomService implements ClassroomServiceContract {
  constructor(private readonly options: ClassroomServiceOptions) {}

  async createRealtimeCall(accessToken: string, sdp: string): Promise<string> {
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

    return this.options.provider.createCall({
      sdp,
      safetyIdentifier: createSafetyIdentifier(
        learner.profileId,
        this.options.safetyIdentifierSalt,
      ),
    });
  }
}

export function createSafetyIdentifier(profileId: string, salt: string): string {
  return `dt_${createHmac("sha256", salt).update(profileId).digest("hex")}`;
}
