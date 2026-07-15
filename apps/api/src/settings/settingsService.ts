import type {
  NotificationPreferencesResponse,
  OnboardingRequest,
  UpdateNotificationPreferencesRequest,
  UserSettingsResponse,
} from "@deutschtrainer/validation";
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
}

export class SettingsService implements SettingsServiceContract {
  private readonly rateLimiter: PrivateRequestRateLimiter;

  constructor(private readonly options: SettingsServiceOptions) {
    const now = options.now ?? (() => new Date());
    this.rateLimiter =
      options.rateLimiter ??
      new PrivateRequestRateLimiter(options.privateRequestsPerMinute ?? 60, now);
  }

  async getSettings(accessToken: string): Promise<UserSettingsResponse> {
    const learner = await this.requireLearner(accessToken);
    return this.options.repository.getSettings(learner.profileId);
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
