const GITHUB_REPOSITORY = "EngelN9/deutschtrainer";
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPOSITORY}`;

// The API runs on a free instance that sleeps, so a cold start can take far longer than a page
// render should wait. Timing out is reported as "sleeping", which is the honest answer.
const HEALTH_TIMEOUT_MS = 4_000;
const GITHUB_TIMEOUT_MS = 5_000;

const CHANGELOG_LIMIT = 6;

export type ServiceState = "ok" | "sleeping" | "unreachable" | "unconfigured";

export interface ServiceStatus {
  state: ServiceState;
  aiPublicEnabled: boolean | null;
}

export interface ChangeEntry {
  number: number;
  title: string;
  mergedAt: string;
  url: string;
}

export interface RepositoryActivity {
  /** null when GitHub could not be reached, so the page can say so instead of showing zero. */
  changes: ChangeEntry[] | null;
  openCount: number | null;
}

interface GitHubPullRequest {
  number: number;
  title: string;
  merged_at: string | null;
  html_url: string;
}

export async function readServiceStatus(apiBaseUrl: string | undefined): Promise<ServiceStatus> {
  if (!apiBaseUrl) {
    return { state: "unconfigured", aiPublicEnabled: null };
  }

  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      return { state: "unreachable", aiPublicEnabled: null };
    }

    const payload: unknown = await response.json();
    const aiPublicEnabled =
      typeof payload === "object" && payload !== null && "aiPublicEnabled" in payload
        ? Boolean((payload as { aiPublicEnabled: unknown }).aiPublicEnabled)
        : null;

    return { state: "ok", aiPublicEnabled };
  } catch (error) {
    // A timeout is the expected shape of a sleeping free instance, not an outage.
    const sleeping = error instanceof Error && error.name === "TimeoutError";
    return { state: sleeping ? "sleeping" : "unreachable", aiPublicEnabled: null };
  }
}

/**
 * Unauthenticated GitHub allows 60 requests per hour per IP. These two calls run once per
 * revalidation window, so a single instance stays well inside that; every failure degrades to null
 * rather than throwing, because a status page that 500s is worse than one that admits it is blind.
 */
export async function readRepositoryActivity(): Promise<RepositoryActivity> {
  const [merged, open] = await Promise.all([readMergedPullRequests(), readOpenPullRequestCount()]);

  return { changes: merged, openCount: open };
}

async function readMergedPullRequests(): Promise<ChangeEntry[] | null> {
  const pulls = await fetchPullRequests("closed", "sort=updated&direction=desc&per_page=30");

  if (!pulls) {
    return null;
  }

  return pulls
    .filter((pull): pull is GitHubPullRequest & { merged_at: string } => pull.merged_at !== null)
    .sort((left, right) => Date.parse(right.merged_at) - Date.parse(left.merged_at))
    .slice(0, CHANGELOG_LIMIT)
    .map((pull) => ({
      number: pull.number,
      title: pull.title,
      mergedAt: pull.merged_at,
      url: pull.html_url,
    }));
}

async function readOpenPullRequestCount(): Promise<number | null> {
  const pulls = await fetchPullRequests("open", "per_page=100");

  return pulls ? pulls.length : null;
}

async function fetchPullRequests(
  state: "open" | "closed",
  query: string,
): Promise<GitHubPullRequest[] | null> {
  try {
    const response = await fetch(`${GITHUB_API}/pulls?state=${state}&${query}`, {
      signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
      headers: { accept: "application/vnd.github+json" },
    });

    if (!response.ok) {
      return null;
    }

    const payload: unknown = await response.json();

    return Array.isArray(payload) ? (payload as GitHubPullRequest[]) : null;
  } catch {
    return null;
  }
}

export function formatMergedDate(iso: string): string {
  const parsed = new Date(iso);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Taipei",
  }).format(parsed);
}
