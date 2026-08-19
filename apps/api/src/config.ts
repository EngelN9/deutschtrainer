export type AppEnvironment = "local" | "test" | "staging" | "production";
export type AiPublicAccessMode = "testers" | "verified_learners";

export interface ApiConfig {
  appEnv: AppEnvironment;
  host: string;
  port: number;
  corsAllowedOrigins: string[];
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  openAiApiKey: string;
  openAiModel: string;
  openAiTtsModel: string;
  openAiTranscriptionModel: string;
  openAiTimeoutMs: number;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  dailyFreeLimit: number;
  writingDailyFreeLimit: number;
  audioTtsDailyFreeLimit: number;
  audioTranscriptionDailyFreeLimit: number;
  contentGenerationDailyFreeLimit: number;
  conversationDailyFreeLimit: number;
  conversationPublicEnabled: boolean;
  publicAiEnabled: boolean;
  aiPublicAccessMode: AiPublicAccessMode;
  aiTestProfileIds: string[];
  globalAiDailyProviderCallLimit: number;
  learningApiRequestsPerMinute: number;
  fakeEvaluationMode: boolean;
}

export function readApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const appEnv = readAppEnvironment(env.APP_ENV);
  return {
    appEnv,
    host: env.HOST?.trim() || "127.0.0.1",
    port: readPositiveInteger(env.PORT, 8787),
    corsAllowedOrigins: readCorsAllowedOrigins(env.CORS_ALLOWED_ORIGINS, appEnv),
    supabaseUrl: env.SUPABASE_URL ?? "http://127.0.0.1:54321",
    supabaseServiceRoleKey: cleanSecret(env.SUPABASE_SERVICE_ROLE_KEY),
    openAiApiKey: cleanSecret(env.OPENAI_API_KEY),
    openAiModel: env.OPENAI_EVALUATION_MODEL?.trim() || "gpt-5.6-luna",
    openAiTtsModel: env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts",
    openAiTranscriptionModel: env.OPENAI_TRANSCRIPTION_MODEL?.trim() || "whisper-1",
    openAiTimeoutMs: readPositiveInteger(env.OPENAI_TIMEOUT_MS, 20_000),
    inputCostPerMillion: readNonNegativeNumber(env.OPENAI_INPUT_COST_PER_MILLION, 1),
    outputCostPerMillion: readNonNegativeNumber(env.OPENAI_OUTPUT_COST_PER_MILLION, 6),
    dailyFreeLimit: readPositiveInteger(env.AI_DAILY_FREE_LIMIT, 5),
    writingDailyFreeLimit: readPositiveInteger(env.AI_WRITING_DAILY_FREE_LIMIT, 2),
    audioTtsDailyFreeLimit: readPositiveInteger(env.AI_AUDIO_TTS_DAILY_FREE_LIMIT, 5),
    audioTranscriptionDailyFreeLimit: readPositiveInteger(
      env.AI_AUDIO_TRANSCRIPTION_DAILY_FREE_LIMIT,
      2,
    ),
    contentGenerationDailyFreeLimit: readPositiveInteger(
      env.AI_CONTENT_GENERATION_DAILY_FREE_LIMIT,
      20,
    ),
    conversationDailyFreeLimit: readPositiveInteger(env.AI_CONVERSATION_DAILY_FREE_LIMIT, 1),
    conversationPublicEnabled: env.CONVERSATION_PUBLIC_ENABLED === "true",
    publicAiEnabled: env.AI_PUBLIC_ENABLED === "true",
    aiPublicAccessMode: readAiPublicAccessMode(env.AI_PUBLIC_ACCESS_MODE),
    aiTestProfileIds: readUuidList(env.AI_TEST_PROFILE_IDS),
    globalAiDailyProviderCallLimit: readPositiveInteger(
      env.AI_GLOBAL_DAILY_PROVIDER_CALL_LIMIT,
      100,
    ),
    learningApiRequestsPerMinute: readPositiveInteger(env.LEARNING_API_REQUESTS_PER_MINUTE, 60),
    fakeEvaluationMode: env.AI_EVALUATION_FAKE_MODE === "true",
  };
}

export function assertApiDeploymentConfig(config: ApiConfig): void {
  if (!config.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required by the API server.");
  }

  const localFakeProvider =
    (config.appEnv === "local" || config.appEnv === "test") && config.fakeEvaluationMode;
  if (config.publicAiEnabled && !config.openAiApiKey && !localFakeProvider) {
    throw new Error("OPENAI_API_KEY is required when AI_PUBLIC_ENABLED=true.");
  }
  if (
    config.publicAiEnabled &&
    config.aiPublicAccessMode === "testers" &&
    config.aiTestProfileIds.length === 0
  ) {
    throw new Error(
      "AI_TEST_PROFILE_IDS must contain at least one profile ID when AI_PUBLIC_ACCESS_MODE=testers.",
    );
  }

  if (config.appEnv === "local" || config.appEnv === "test") {
    return;
  }

  if (config.fakeEvaluationMode) {
    throw new Error("AI_EVALUATION_FAKE_MODE must be false in staging and production.");
  }

  assertRemoteCorsOrigins(config.corsAllowedOrigins);

  let supabaseUrl: URL;
  try {
    supabaseUrl = new URL(config.supabaseUrl);
  } catch {
    throw new Error("SUPABASE_URL must be a valid absolute URL.");
  }

  if (supabaseUrl.protocol !== "https:") {
    throw new Error("SUPABASE_URL must use HTTPS in staging and production.");
  }
}

function readAiPublicAccessMode(value: string | undefined): AiPublicAccessMode {
  const normalized = value?.trim() || "testers";
  if (normalized === "testers" || normalized === "verified_learners") {
    return normalized;
  }
  throw new Error("AI_PUBLIC_ACCESS_MODE must be testers or verified_learners.");
}

function readUuidList(value: string | undefined): string[] {
  const entries = value
    ?.split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
  const uniqueEntries = [...new Set(entries ?? [])];
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  if (uniqueEntries.some((entry) => !uuidPattern.test(entry))) {
    throw new Error("AI_TEST_PROFILE_IDS must contain comma-separated UUIDs.");
  }
  return uniqueEntries;
}

export function resolveCorsResponseOrigin(
  requestOrigin: string | undefined,
  allowedOrigins: readonly string[],
): string | undefined {
  if (!requestOrigin) {
    return undefined;
  }
  if (allowedOrigins.includes("*")) {
    return "*";
  }

  let normalizedOrigin: string;
  try {
    normalizedOrigin = new URL(requestOrigin).origin;
  } catch {
    return undefined;
  }
  return allowedOrigins.includes(normalizedOrigin) ? normalizedOrigin : undefined;
}

function cleanSecret(value: string | undefined): string {
  if (!value || value.startsWith("replace-with-")) {
    return "";
  }
  return value.trim();
}

function readAppEnvironment(value: string | undefined): AppEnvironment {
  const normalized = value?.trim() || "local";
  if (
    normalized === "local" ||
    normalized === "test" ||
    normalized === "staging" ||
    normalized === "production"
  ) {
    return normalized;
  }
  throw new Error("APP_ENV must be one of local, test, staging, or production.");
}

function readCorsAllowedOrigins(value: string | undefined, appEnv: AppEnvironment): string[] {
  const entries = value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (!entries || entries.length === 0) {
    return appEnv === "local" || appEnv === "test" ? ["*"] : [];
  }
  return [...new Set(entries.map(normalizeCorsOrigin))];
}

function normalizeCorsOrigin(value: string): string {
  if (value === "*") {
    return value;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("CORS_ALLOWED_ORIGINS must contain valid absolute origins.");
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("CORS_ALLOWED_ORIGINS entries must be origins without paths or credentials.");
  }
  return url.origin;
}

function assertRemoteCorsOrigins(origins: readonly string[]): void {
  if (origins.length === 0) {
    throw new Error("CORS_ALLOWED_ORIGINS is required in staging and production.");
  }

  for (const origin of origins) {
    if (origin === "*") {
      throw new Error("CORS_ALLOWED_ORIGINS must not contain * in staging or production.");
    }
    const url = new URL(origin);
    if (url.protocol !== "https:" || isLocalHostname(url.hostname)) {
      throw new Error("CORS_ALLOWED_ORIGINS must contain remote HTTPS origins.");
    }
  }
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readNonNegativeNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
