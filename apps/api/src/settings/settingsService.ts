import type {
  AiEntitlementResponse,
  NotificationPreferencesResponse,
  OnboardingRequest,
  UpdateNotificationPreferencesRequest,
  UserSettingsResponse,
} from "@deutschtrainer/validation";
import type { AiQuotaFeature } from "../ai-quota/types";
import { ApiError } from "../errors";
import { PrivateRequestRateLimiter } from "../privateRequestRateLimiter";
import type {
  AuthenticatedSettingsUser,
  SettingsRepository,
  SettingsServiceContract,
} from "./types";

interface SettingsServiceOptions {
  repository: SettingsRepository;
  privateRequestsPerMinute?: number;
  rateLimiter?: PrivateRequestRateLimiter;
  now?: () => Date;
  aiEntitlement: {
    providerConfigured: boolean;
    publicEnabled: boolean;
    quotas: Record<AiQuotaFeature, number>;
  };
}

export class SettingsService implements SettingsServiceContract {
  private readonly rateLimiter: PrivateRequestRateLimiter;
  private readonly now: () => Date;

  constructor(private readonly options: SettingsServiceOptions) {
    this.now = options.now ?? (() => new Date());
    this.rateLimiter =
      options.rateLimiter ??
      new PrivateRequestRateLimiter(options.privateRequestsPerMinute ?? 60, this.now);
  }

  async getSettings(accessToken: string): Promise<UserSettingsResponse> {
    const learner = await this.requireLearner(accessToken);
    return this.options.repository.getSettings(learner.profileId);
  }

  async getAiEntitlement(accessToken: string): Promise<AiEntitlementResponse> {
    const learner = await this.requireLearner(accessToken);
    const now = this.now();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const rows = await this.options.repository.listAiQuotaUsage(learner.profileId, since);
    const quota = (feature: AiQuotaFeature) => {
      const featureRows = rows.filter((row) => row.feature === feature);
      const limit = this.options.aiEntitlement.quotas[feature];
      const used = featureRows.length;
      const oldest = featureRows[0]?.reservedAt;
      return {
        limit,
        used,
        remaining: Math.max(0, limit - used),
        resetsAt: oldest
          ? new Date(new Date(oldest).getTime() + 24 * 60 * 60 * 1000).toISOString()
          : null,
      };
    };

    return {
      providerAvailable:
        this.options.aiEntitlement.publicEnabled &&
        this.options.aiEntitlement.providerConfigured &&
        learner.emailVerified &&
        learner.role === "learner",
      source: "platform_free",
      windowHours: 24,
      quotas: {
        responseEvaluation: quota("evaluate_response"),
        writingEvaluation: quota("evaluate_writing"),
        textToSpeech: quota("text_to_speech"),
        transcription: quota("transcribe_audio"),
      },
    };
  }

  async completeOnboarding(
    accessToken: string,
    request: OnboardingRequest,
  ): Promise<UserSettingsResponse> {
    const learner = await this.requireLearner(accessToken);
    await this.options.repository.completeOnboarding(learner.profileId, request);
    return this.options.repository.getSettings(learner.profileId);
  }

  async updateNotificationPreferences(
    accessToken: string,
    request: UpdateNotificationPreferencesRequest,
  ): Promise<NotificationPreferencesResponse> {
    const learner = await this.requireLearner(accessToken);
    await this.options.repository.updateNotificationPreferences(learner.profileId, request);
    const settings = await this.options.repository.getSettings(learner.profileId);
    return { notifications: settings.notifications };
  }

  private async requireLearner(accessToken: string): Promise<AuthenticatedSettingsUser> {
    const learner = await this.options.repository.authenticate(accessToken);
    if (!learner) {
      throw new ApiError("UNAUTHORIZED", "登入狀態已失效，請重新登入。", 401, false);
    }
    this.rateLimiter.assertAllowed(learner.profileId);
    return learner;
  }
}
