export interface ApiConfig {
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
  fakeEvaluationMode: boolean;
}

export function readApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return {
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
    fakeEvaluationMode: env.AI_EVALUATION_FAKE_MODE === "true",
  };
}

function cleanSecret(value: string | undefined): string {
  if (!value || value.startsWith("replace-with-")) {
    return "";
  }
  return value.trim();
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readNonNegativeNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
