import { ApiError } from "./errors";

export class PrivateRequestRateLimiter {
  private readonly requestWindows = new Map<string, number[]>();

  constructor(
    private readonly requestsPerMinute: number,
    private readonly now: () => Date,
  ) {}

  assertAllowed(profileId: string): void {
    const now = this.now().getTime();
    const active = (this.requestWindows.get(profileId) ?? []).filter(
      (timestamp) => timestamp > now - 60_000,
    );
    if (active.length >= this.requestsPerMinute) {
      throw new ApiError("RATE_LIMITED", "操作過於頻繁，請稍後再試。", 429, true);
    }
    active.push(now);
    this.requestWindows.set(profileId, active);
  }
}
