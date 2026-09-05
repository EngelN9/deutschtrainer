export type AppEnvironment = "local" | "test" | "staging" | "production";

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
  publicAiEnabled: boolean;
  globalAiDailyProviderCallLimit: number;
  learningApiRequestsPerMinute: number;
  fakeEvaluationMode: boolean;
  classroomEnabled: boolean;
  classroomAllowedProfileIds: string[];
  classroomMaxSessionSeconds: number;
  classroomDailySessionLimit: number;
  classroomGlobalDailySessionLimit: number;
  classroomSweepIntervalMs: number;
  openAiRealtimeModel: string;
  openAiSafetyIdentifierSalt: string;
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
    publicAiEnabled: env.AI_PUBLIC_ENABLED === "true",
    globalAiDailyProviderCallLimit: readPositiveInteger(
      env.AI_GLOBAL_DAILY_PROVIDER_CALL_LIMIT,
      100,
    ),
    learningApiRequestsPerMinute: readPositiveInteger(env.LEARNING_API_REQUESTS_PER_MINUTE, 60),
    fakeEvaluationMode: env.AI_EVALUATION_FAKE_MODE === "true",
    classroomEnabled: env.CLASSROOM_ENABLED === "true",
    classroomAllowedProfileIds: readCommaSeparatedValues(env.CLASSROOM_ALLOWED_PROFILE_IDS),
    // 15 minutes: long enough for a real lesson, and realtime cost grows superlinearly with
    // session length because the conversation is replayed as input on every turn.
    classroomMaxSessionSeconds: readPositiveInteger(env.CLASSROOM_MAX_SESSION_SECONDS, 900),
    classroomDailySessionLimit: readPositiveInteger(env.CLASSROOM_DAILY_SESSION_LIMIT, 2),
    classroomGlobalDailySessionLimit: readPositiveInteger(
      env.CLASSROOM_GLOBAL_DAILY_SESSION_LIMIT,
      3,
    ),
    classroomSweepIntervalMs: readPositiveInteger(env.CLASSROOM_SWEEP_INTERVAL_MS, 30_000),
    openAiRealtimeModel: env.OPENAI_REALTIME_MODEL?.trim() || "gpt-realtime-mini-2025-12-15",
    openAiSafetyIdentifierSalt: cleanSecret(env.OPENAI_SAFETY_IDENTIFIER_SALT),
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

  if (config.classroomEnabled) {
    if (!config.openAiApiKey) {
      throw new Error("OPENAI_API_KEY is required when CLASSROOM_ENABLED=true.");
    }
    if (config.classroomAllowedProfileIds.length === 0) {
      throw new Error("CLASSROOM_ALLOWED_PROFILE_IDS is required when CLASSROOM_ENABLED=true.");
    }
    if (!config.openAiSafetyIdentifierSalt) {
      throw new Error("OPENAI_SAFETY_IDENTIFIER_SALT is required when CLASSROOM_ENABLED=true.");
    }
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

function readCommaSeparatedValues(value: string | undefined): string[] {
  return [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  ];
}
