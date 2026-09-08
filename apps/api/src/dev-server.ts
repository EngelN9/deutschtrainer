import { createServer, type IncomingHttpHeaders } from "node:http";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { createApiHandler } from "./app";
import { ClassroomService } from "./classroom/classroomService";
import {
  OpenAiRealtimeProvider,
  UnavailableRealtimeProvider,
} from "./classroom/openAiRealtimeProvider";
import { SupabaseClassroomAuthenticator } from "./classroom/supabaseClassroomAuthenticator";
import { SupabaseClassroomRepository } from "./classroom/supabaseClassroomRepository";
import { SupabaseAiQuotaGate } from "./ai-quota/supabaseAiQuotaGate";
import { AccountDataService } from "./account-data/accountDataService";
import { SupabaseAccountDataRepository } from "./account-data/supabaseAccountDataRepository";
import { AudioLearningService } from "./audio/audioService";
import {
  DeterministicAudioProvider,
  OpenAiAudioProvider,
  UnavailableAudioProvider,
} from "./audio/openAiAudioProvider";
import { SupabaseAudioRepository } from "./audio/supabaseAudioRepository";
import { assertApiDeploymentConfig, readApiConfig, resolveCorsResponseOrigin } from "./config";
import { ContentGenerationService } from "./content-generation/contentGenerationService";
import {
  DeterministicContentGenerationProvider,
  OpenAiContentGenerationProvider,
  UnavailableContentGenerationProvider,
} from "./content-generation/openAiContentGenerationProvider";
import { SupabaseContentGenerationRepository } from "./content-generation/supabaseContentGenerationRepository";
import { ResponseEvaluationService } from "./evaluation/evaluationService";
import {
  DeterministicEvaluationProvider,
  OpenAiEvaluationProvider,
  UnavailableEvaluationProvider,
} from "./evaluation/openAiEvaluationProvider";
import { SupabaseEvaluationRepository } from "./evaluation/supabaseEvaluationRepository";
import { LearningDataService } from "./learning-data/learningDataService";
import { SupabaseLearningDataRepository } from "./learning-data/supabaseLearningDataRepository";
import { KnowledgeService } from "./knowledge/knowledgeService";
import { SupabaseKnowledgeRepository } from "./knowledge/supabaseKnowledgeRepository";
import { createHttpRequestLog, resolveRequestId } from "./observability";
import { readRequestBody, RequestBodyTooLargeError } from "./requestBody";
import { PrivateRequestRateLimiter } from "./privateRequestRateLimiter";
import { SettingsService } from "./settings/settingsService";
import { SupabaseSettingsRepository } from "./settings/supabaseSettingsRepository";
import { SupabaseWritingRepository } from "./writing/supabaseWritingRepository";
import { WritingEvaluationService } from "./writing/writingService";
import {
  DeterministicWritingProvider,
  OpenAiWritingProvider,
  UnavailableWritingProvider,
} from "./writing/openAiWritingProvider";

loadLocalEnvironmentFile();

const config = readApiConfig();
assertApiDeploymentConfig(config);

const quotaGate = new SupabaseAiQuotaGate(config.supabaseUrl, config.supabaseServiceRoleKey, {
  publicEnabled: config.publicAiEnabled,
  globalDailyProviderCallLimit: config.globalAiDailyProviderCallLimit,
});

const repository = new SupabaseEvaluationRepository(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
);
const provider = config.fakeEvaluationMode
  ? new DeterministicEvaluationProvider()
  : config.openAiApiKey
    ? new OpenAiEvaluationProvider({
        apiKey: config.openAiApiKey,
        model: config.openAiModel,
        timeoutMs: config.openAiTimeoutMs,
      })
    : new UnavailableEvaluationProvider(config.openAiModel);
const evaluationService = new ResponseEvaluationService({
  repository,
  provider,
  dailyLimit: config.dailyFreeLimit,
  quotaGate,
  inputCostPerMillion: config.inputCostPerMillion,
  outputCostPerMillion: config.outputCostPerMillion,
});
const privateRequestRateLimiter = new PrivateRequestRateLimiter(
  config.learningApiRequestsPerMinute,
  () => new Date(),
);
const learningDataService = new LearningDataService({
  repository: new SupabaseLearningDataRepository(config.supabaseUrl, config.supabaseServiceRoleKey),
  rateLimiter: privateRequestRateLimiter,
});
const knowledgeService = new KnowledgeService(
  new SupabaseKnowledgeRepository(config.supabaseUrl, config.supabaseServiceRoleKey),
);
const accountDataService = new AccountDataService({
  repository: new SupabaseAccountDataRepository(config.supabaseUrl, config.supabaseServiceRoleKey),
  rateLimiter: privateRequestRateLimiter,
});
const writingRepository = new SupabaseWritingRepository(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
);
const writingProvider = config.fakeEvaluationMode
  ? new DeterministicWritingProvider()
  : config.openAiApiKey
    ? new OpenAiWritingProvider({
        apiKey: config.openAiApiKey,
        model: config.openAiModel,
        timeoutMs: config.openAiTimeoutMs,
      })
    : new UnavailableWritingProvider(config.openAiModel);
const writingService = new WritingEvaluationService({
  repository: writingRepository,
  provider: writingProvider,
  dailyLimit: config.writingDailyFreeLimit,
  quotaGate,
  rateLimiter: privateRequestRateLimiter,
  inputCostPerMillion: config.inputCostPerMillion,
  outputCostPerMillion: config.outputCostPerMillion,
});
const audioRepository = new SupabaseAudioRepository(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
);
const audioProvider = config.fakeEvaluationMode
  ? new DeterministicAudioProvider()
  : config.openAiApiKey
    ? new OpenAiAudioProvider({
        apiKey: config.openAiApiKey,
        ttsModel: config.openAiTtsModel,
        transcriptionModel: config.openAiTranscriptionModel,
        timeoutMs: config.openAiTimeoutMs,
      })
    : new UnavailableAudioProvider(config.openAiTtsModel, config.openAiTranscriptionModel);
const audioService = new AudioLearningService({
  repository: audioRepository,
  provider: audioProvider,
  dailyTtsLimit: config.audioTtsDailyFreeLimit,
  dailyTranscriptionLimit: config.audioTranscriptionDailyFreeLimit,
  quotaGate,
  rateLimiter: privateRequestRateLimiter,
});
const contentGenerationRepository = new SupabaseContentGenerationRepository(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
);
const contentGenerationProvider = config.fakeEvaluationMode
  ? new DeterministicContentGenerationProvider()
  : config.openAiApiKey
    ? new OpenAiContentGenerationProvider({
        apiKey: config.openAiApiKey,
        model: config.openAiModel,
        timeoutMs: config.openAiTimeoutMs,
      })
    : new UnavailableContentGenerationProvider(config.openAiModel);
const contentGenerationService = new ContentGenerationService({
  repository: contentGenerationRepository,
  provider: contentGenerationProvider,
  dailyLimit: config.contentGenerationDailyFreeLimit,
  inputCostPerMillion: config.inputCostPerMillion,
  outputCostPerMillion: config.outputCostPerMillion,
});
const settingsService = new SettingsService({
  repository: new SupabaseSettingsRepository(config.supabaseUrl, config.supabaseServiceRoleKey),
  rateLimiter: privateRequestRateLimiter,
  aiEntitlement: {
    providerConfigured:
      provider.configured && writingProvider.configured && audioProvider.configured,
    publicEnabled: config.publicAiEnabled,
    quotas: {
      evaluate_response: config.dailyFreeLimit,
      evaluate_writing: config.writingDailyFreeLimit,
      text_to_speech: config.audioTtsDailyFreeLimit,
      transcribe_audio: config.audioTranscriptionDailyFreeLimit,
    },
  },
});
const classroomProvider = config.openAiApiKey
  ? new OpenAiRealtimeProvider({
      apiKey: config.openAiApiKey,
      model: config.openAiRealtimeModel,
      timeoutMs: config.openAiTimeoutMs,
    })
  : new UnavailableRealtimeProvider();
const classroomService = new ClassroomService({
  allowedProfileIds: new Set(config.classroomAllowedProfileIds),
  authenticator: new SupabaseClassroomAuthenticator(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
  ),
  dailySessionLimit: config.classroomDailySessionLimit,
  enabled: config.classroomEnabled,
  globalDailySessionLimit: config.classroomGlobalDailySessionLimit,
  maxSessionSeconds: config.classroomMaxSessionSeconds,
  provider: classroomProvider,
  repository: new SupabaseClassroomRepository(config.supabaseUrl, config.supabaseServiceRoleKey),
  safetyIdentifierSalt: config.openAiSafetyIdentifierSalt,
});
const handlerDependencies = {
  accountDataService,
  evaluationService,
  writingService,
  audioService,
  contentGenerationService,
  learningDataService,
  knowledgeService,
  settingsService,
  classroomService,
  aiPublicEnabled: config.publicAiEnabled,
  aiConfigured:
    provider.configured &&
    writingProvider.configured &&
    audioProvider.configured &&
    contentGenerationProvider.configured,
  classroomConfigured:
    classroomProvider.configured &&
    config.classroomAllowedProfileIds.length > 0 &&
    Boolean(config.openAiSafetyIdentifierSalt),
  classroomEnabled: config.classroomEnabled,
};

const server = createServer(async (incoming, outgoing) => {
  const startedAt = performance.now();
  const requestId = resolveRequestId(incoming.headers["x-request-id"]?.toString());
  const requestUrl = new URL(incoming.url ?? "/", `http://${incoming.headers.host ?? "localhost"}`);
  let status = 500;

  try {
    const body = await readRequestBody(incoming);
    const requestHeaders = toWebHeaders(incoming.headers);
    requestHeaders.set("x-request-id", requestId);
    const request = new Request(requestUrl, {
      method: incoming.method ?? "GET",
      headers: requestHeaders,
      ...(body.length > 0 ? { body: new Uint8Array(body) } : {}),
    });
    const handleRequest = createApiHandler({
      ...handlerDependencies,
      requestId: () => requestId,
    });
    const response = await handleRequest(request);
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    responseHeaders["x-request-id"] = requestId;
    applyCorsResponseHeaders(
      responseHeaders,
      readSingleHeader(incoming.headers.origin),
      config.corsAllowedOrigins,
    );
    status = response.status;
    outgoing.writeHead(response.status, responseHeaders);
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    const requestTooLarge = error instanceof RequestBodyTooLargeError;
    status = requestTooLarge ? 413 : 500;
    const responseHeaders: Record<string, string> = {
      "content-type": "application/json; charset=utf-8",
      "x-request-id": requestId,
    };
    applyCorsResponseHeaders(
      responseHeaders,
      readSingleHeader(incoming.headers.origin),
      config.corsAllowedOrigins,
    );
    outgoing.writeHead(status, responseHeaders);
    outgoing.end(
      JSON.stringify({
        error: {
          code: requestTooLarge ? "VALIDATION_ERROR" : "DATABASE_ERROR",
          message: requestTooLarge ? "要求內容超過伺服器允許的大小。" : "API 伺服器無法處理要求。",
          retryable: !requestTooLarge,
          requestId,
        },
      }),
    );
  } finally {
    const logEntry = createHttpRequestLog({
      requestId,
      method: incoming.method ?? "GET",
      pathname: requestUrl.pathname,
      status,
      durationMs: performance.now() - startedAt,
    });
    const writeLog = logEntry.level === "error" ? console.error : console.log;
    writeLog(JSON.stringify(logEntry));
  }
});

server.listen(config.port, config.host, () => {
  console.log(
    JSON.stringify({
      level: "info",
      event: "api_started",
      host: config.host,
      port: config.port,
      appEnv: config.appEnv,
    }),
  );
});

// Sweeping on boot as well as on an interval is the point: a deploy or a crash restarts this
// process while calls keep running and billing at the provider, and only a boot sweep ends them.
// ponytail: a single in-process timer, correct while the API runs one instance. Two instances
// would double-hang-up (harmless, hangup is idempotent) but should move to a scheduled job.
if (config.classroomEnabled) {
  void runClassroomSweep();
  const sweepTimer = setInterval(() => void runClassroomSweep(), config.classroomSweepIntervalMs);
  sweepTimer.unref();
}

async function runClassroomSweep(): Promise<void> {
  try {
    const ended = await classroomService.sweepExpiredSessions();
    if (ended > 0) {
      console.log(JSON.stringify({ level: "info", event: "classroom_sessions_expired", ended }));
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "classroom_sweep_failed",
        message: error instanceof Error ? error.message : "unknown",
      }),
    );
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => shutdown(signal));
}

function shutdown(signal: NodeJS.Signals): void {
  console.log(JSON.stringify({ level: "info", event: "api_shutdown_started", signal }));
  const forcedShutdown = setTimeout(() => {
    server.closeAllConnections();
    process.exit(1);
  }, 10_000);
  forcedShutdown.unref();

  server.close((error) => {
    clearTimeout(forcedShutdown);
    if (error) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "api_shutdown_failed",
          errorCategory: "SERVER_CLOSE_ERROR",
        }),
      );
      process.exit(1);
    }
    process.exit(0);
  });
}

function toWebHeaders(headers: IncomingHttpHeaders): Headers {
  const result = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        result.append(key, entry);
      }
    } else if (value !== undefined) {
      result.set(key, value);
    }
  }
  return result;
}

function applyCorsResponseHeaders(
  headers: Record<string, string>,
  requestOrigin: string | undefined,
  allowedOrigins: readonly string[],
): void {
  delete headers["access-control-allow-origin"];
  const responseOrigin = resolveCorsResponseOrigin(requestOrigin, allowedOrigins);
  if (!responseOrigin) {
    return;
  }

  headers["access-control-allow-origin"] = responseOrigin;
  if (responseOrigin !== "*") {
    const varyValues = new Set(
      (headers.vary ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    );
    varyValues.add("Origin");
    headers.vary = [...varyValues].join(", ");
  }
}

function readSingleHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

function loadLocalEnvironmentFile(): void {
  const explicitPath = process.env.API_ENV_FILE?.trim();
  const candidates = explicitPath
    ? [resolve(process.cwd(), explicitPath)]
    : [resolve(process.cwd(), ".env"), resolve(process.cwd(), "..", "..", ".env")];

  for (const candidate of new Set(candidates)) {
    try {
      loadEnvFile(candidate);
      return;
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
    }
  }
}
