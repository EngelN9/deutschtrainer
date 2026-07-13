import { createServer, type IncomingHttpHeaders, type IncomingMessage } from "node:http";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { createApiHandler } from "./app";
import { readApiConfig } from "./config";
import { ResponseEvaluationService } from "./evaluation/evaluationService";
import {
  DeterministicEvaluationProvider,
  OpenAiEvaluationProvider,
  UnavailableEvaluationProvider,
} from "./evaluation/openAiEvaluationProvider";
import { SupabaseEvaluationRepository } from "./evaluation/supabaseEvaluationRepository";

try {
  loadEnvFile(fileURLToPath(new URL("../../../.env", import.meta.url)));
} catch (error) {
  if (!isMissingFileError(error)) {
    throw error;
  }
}

const config = readApiConfig();
if (!config.supabaseServiceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required by the API server.");
}

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
  inputCostPerMillion: config.inputCostPerMillion,
  outputCostPerMillion: config.outputCostPerMillion,
});
const handleRequest = createApiHandler({
  evaluationService,
  aiConfigured: provider.configured,
});

const server = createServer(async (incoming, outgoing) => {
  try {
    const body = await readRequestBody(incoming);
    const request = new Request(
      new URL(incoming.url ?? "/", `http://${incoming.headers.host ?? "localhost"}`),
      {
        method: incoming.method ?? "GET",
        headers: toWebHeaders(incoming.headers),
        ...(body.length > 0 ? { body: new Uint8Array(body) } : {}),
      },
    );
    const response = await handleRequest(request);
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    outgoing.writeHead(response.status, responseHeaders);
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    outgoing.writeHead(500, { "content-type": "application/json; charset=utf-8" });
    outgoing.end(
      JSON.stringify({
        error: {
          code: "DATABASE_ERROR",
          message: "API 伺服器無法處理要求。",
          retryable: true,
          requestId: "server-adapter",
        },
      }),
    );
  }
});

server.listen(config.port, () => {
  console.log(`Deutschtrainer API listening on http://localhost:${config.port}`);
});

function readRequestBody(request: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer | string) =>
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk),
    );
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
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

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}
