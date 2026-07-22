export type AppEnvironment = "local" | "test" | "staging" | "production";

export interface ApiConfig {
  appEnv: AppEnvironment;
  host: string;
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
}

export function readApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return {
    appEnv: readAppEnvironment(env.APP_ENV),
    host: env.HOST?.trim() || "127.0.0.1",
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

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readNonNegativeNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
