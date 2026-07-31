import { ApiError } from "../errors";
import { PrivateRequestRateLimiter } from "../privateRequestRateLimiter";
import type {
  AccountDataRepository,
  AccountDataServiceContract,
  AuthenticatedAccount,
} from "./types";

interface AccountDataServiceOptions {
  repository: AccountDataRepository;
  privateRequestsPerMinute?: number;
  rateLimiter?: PrivateRequestRateLimiter;
  now?: () => Date;
}

export class AccountDataService implements AccountDataServiceContract {
  private readonly rateLimiter: PrivateRequestRateLimiter;

  constructor(private readonly options: AccountDataServiceOptions) {
    const now = options.now ?? (() => new Date());
    this.rateLimiter =
      options.rateLimiter ??
      new PrivateRequestRateLimiter(options.privateRequestsPerMinute ?? 60, now);
  }

  async exportAccount(accessToken: string) {
    const account = await this.requireAccount(accessToken, false);
    return this.options.repository.exportAccount(account);
  }

  async deleteAccount(accessToken: string) {
    const account = await this.requireAccount(accessToken, true);
    const storageObjects = await this.options.repository.beginDeletion(account.authUserId);
    await this.options.repository.deleteStorageObjects(storageObjects);
    await this.options.repository.deleteAuthUser(account.authUserId);
    return { deleted: true as const };
  }

  private async requireAccount(
    accessToken: string,
    includeDeleting: boolean,
  ): Promise<AuthenticatedAccount> {
    const account = await this.options.repository.authenticate(accessToken, { includeDeleting });
    if (!account) {
      throw new ApiError("UNAUTHORIZED", "登入狀態已失效，請重新登入。", 401, false);
    }
    this.rateLimiter.assertAllowed(account.profileId);
    return account;
  }
}
