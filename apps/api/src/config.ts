export type AppEnvironment = "local" | "test" | "staging" | "production";
export type ApiLogLevel = "debug" | "info" | "warn" | "error";

export interface ApiConfig {
  apiReleaseId: string;
  appEnv: AppEnvironment;
  corsAllowedOrigins: string[];
  host: string;
  logLevel: ApiLogLevel;
  port: number;
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
  learningApiRequestsPerMinute: number;
  fakeEvaluationMode: boolean;
  webOrigin: string;
}

export function readApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const appEnv = readAppEnvironment(env.APP_ENV);
  return {
    apiReleaseId: env.API_RELEASE_ID?.trim() || "local",
    appEnv,
    corsAllowedOrigins: readOriginList(env.CORS_ALLOWED_ORIGINS, appEnv),
    host: env.HOST?.trim() || "127.0.0.1",
    logLevel: readLogLevel(env.LOG_LEVEL),
    port: readPositiveInteger(env.PORT, 8787),
    supabaseUrl: env.SUPABASE_URL ?? "http://127.0.0.1:54321",
    supabaseServiceRoleKey: cleanSecret(env.SUPABASE_SERVICE_ROLE_KEY),
    openAiApiKey: cleanSecret(env.OPENAI_API_KEY),
    openAiModel: env.OPENAI_EVALUATION_MODEL?.trim() || "gpt-5.6-luna",
    openAiTtsModel: env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts",
    openAiTranscriptionModel: env.OPENAI_TRANSCRIPTION_MODEL?.trim() || "whisper-1",
    openAiTimeoutMs: readPositiveInteger(env.OPENAI_TIMEOUT_MS, 20_000),
    inputCostPerMillion: readNonNegativeNumber(env.OPENAI_INPUT_COST_PER_MILLION, 1),
    outputCostPerMillion: readNonNegativeNumber(env.OPENAI_OUTPUT_COST_PER_MILLION, 6),
    dailyFreeLimit: readPositiveInteger(env.AI_DAILY_FREE_LIMIT, 20),
    writingDailyFreeLimit: readPositiveInteger(env.AI_WRITING_DAILY_FREE_LIMIT, 10),
    audioTtsDailyFreeLimit: readPositiveInteger(env.AI_AUDIO_TTS_DAILY_FREE_LIMIT, 20),
    audioTranscriptionDailyFreeLimit: readPositiveInteger(
      env.AI_AUDIO_TRANSCRIPTION_DAILY_FREE_LIMIT,
      10,
    ),
    contentGenerationDailyFreeLimit: readPositiveInteger(
      env.AI_CONTENT_GENERATION_DAILY_FREE_LIMIT,
      20,
    ),
    learningApiRequestsPerMinute: readPositiveInteger(env.LEARNING_API_REQUESTS_PER_MINUTE, 60),
    fakeEvaluationMode: env.AI_EVALUATION_FAKE_MODE === "true",
    webOrigin: env.WEB_ORIGIN?.trim() || "http://localhost:3000",
  };
}

export function assertApiDeploymentConfig(config: ApiConfig): void {
  if (!config.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required by the API server.");
  }

  if (config.appEnv === "local" || config.appEnv === "test") {
    return;
  }

  if (config.fakeEvaluationMode) {
    throw new Error("AI_EVALUATION_FAKE_MODE must be false in staging and production.");
  }

  if (!config.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is required in staging and production.");
  }

  assertRemoteHttpsUrl(config.supabaseUrl, "SUPABASE_URL");
  assertRemoteHttpsUrl(config.webOrigin, "WEB_ORIGIN");
  if (config.corsAllowedOrigins.length === 0) {
    throw new Error("CORS_ALLOWED_ORIGINS is required in staging and production.");
  }
  for (const origin of config.corsAllowedOrigins) {
    assertRemoteHttpsUrl(origin, "CORS_ALLOWED_ORIGINS");
  }
  if (!config.corsAllowedOrigins.includes(new URL(config.webOrigin).origin)) {
    throw new Error("CORS_ALLOWED_ORIGINS must include WEB_ORIGIN.");
  }
  if (
    !config.apiReleaseId ||
    config.apiReleaseId === "local" ||
    isPlaceholder(config.apiReleaseId)
  ) {
    throw new Error("API_RELEASE_ID is required in staging and production.");
  }
}

function cleanSecret(value: string | undefined): string {
  if (!value || isPlaceholder(value)) {
    return "";
  }
  return value.trim();
}

function isPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.startsWith("replace-with-") ||
    normalized.includes("placeholder") ||
    normalized === "example" ||
    normalized === "changeme"
  );
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

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readNonNegativeNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function readLogLevel(value: string | undefined): ApiLogLevel {
  const normalized = value?.trim() || "info";
  if (
    normalized === "debug" ||
    normalized === "info" ||
    normalized === "warn" ||
    normalized === "error"
  ) {
    return normalized;
  }
  throw new Error("LOG_LEVEL must be one of debug, info, warn, or error.");
}

function readOriginList(value: string | undefined, appEnvironment: AppEnvironment): string[] {
  if (!value?.trim()) {
    return appEnvironment === "local" || appEnvironment === "test" ? ["http://localhost:3000"] : [];
  }
  return [
    ...new Set(
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
        .map((origin) => {
          try {
            return new URL(origin).origin;
          } catch {
            throw new Error("CORS_ALLOWED_ORIGINS must contain valid absolute origins.");
          }
        }),
    ),
  ];
}

function assertRemoteHttpsUrl(value: string, variableName: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} must be a valid absolute URL.`);
  }
  if (
    url.protocol !== "https:" ||
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "0.0.0.0" ||
    url.hostname === "::1"
  ) {
    throw new Error(`${variableName} must use a non-local HTTPS URL in staging and production.`);
  }
}
