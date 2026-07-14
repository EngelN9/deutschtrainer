import { randomUUID } from "node:crypto";
import {
  apiErrorResponseSchema,
  deleteSpeakingSubmissionResponseSchema,
  evaluateResponseRequestSchema,
  evaluateResponseResponseSchema,
  evaluateWritingRequestSchema,
  evaluateWritingResponseSchema,
  generateExerciseDraftRequestSchema,
  generateExerciseDraftResponseSchema,
  revealListeningTranscriptRequestSchema,
  revealListeningTranscriptResponseSchema,
  submitDictationRequestSchema,
  submitDictationResponseSchema,
  textToSpeechRequestSchema,
  textToSpeechResponseSchema,
  transcribeRequestSchema,
  transcribeResponseSchema,
} from "@deutschtrainer/validation";
import type { AudioLearningServiceContract } from "./audio/types";
import type { ContentGenerationServiceContract } from "./content-generation/types";
import { ApiError, toApiError } from "./errors";
import type { EvaluationService } from "./evaluation/types";
import type { WritingService } from "./writing/types";

export interface ApiHandlerOptions {
  evaluationService: EvaluationService;
  writingService: WritingService;
  audioService: AudioLearningServiceContract;
  contentGenerationService: ContentGenerationServiceContract;
  aiConfigured: boolean;
  requestId?: () => string;
}

export function createApiHandler(options: ApiHandlerOptions) {
  const createRequestId = options.requestId ?? randomUUID;

  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return jsonResponse(
        { status: "ok", service: "deutschtrainer-api", aiConfigured: options.aiConfigured },
        200,
      );
    }

    if (request.method === "POST" && url.pathname === "/ai/evaluate-response") {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const body = await readJsonBody(request);
        const parsed = evaluateResponseRequestSchema.safeParse(body);
        if (!parsed.success) {
          throw new ApiError(
            "VALIDATION_ERROR",
            parsed.error.issues[0]?.message ?? "批改要求格式不正確。",
            400,
            false,
          );
        }

        const result = await options.evaluationService.evaluate(accessToken, parsed.data);
        return jsonResponse(evaluateResponseResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    if (request.method === "POST" && url.pathname === "/ai/evaluate-writing") {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const body = await readJsonBody(request);
        const parsed = evaluateWritingRequestSchema.safeParse(body);
        if (!parsed.success) {
          throw new ApiError(
            "VALIDATION_ERROR",
            parsed.error.issues[0]?.message ?? "作文批改要求格式不正確。",
            400,
            false,
          );
        }

        const result = await options.writingService.evaluate(accessToken, parsed.data);
        return jsonResponse(evaluateWritingResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    if (request.method === "POST" && url.pathname === "/audio/text-to-speech") {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const parsed = textToSpeechRequestSchema.safeParse(await readJsonBody(request));
        if (!parsed.success) {
          throw validationError(parsed.error.issues[0]?.message, "語音合成要求格式不正確。");
        }
        const result = await options.audioService.synthesize(accessToken, parsed.data);
        return jsonResponse(textToSpeechResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    if (request.method === "POST" && url.pathname === "/listening/reveal-transcript") {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const parsed = revealListeningTranscriptRequestSchema.safeParse(
          await readJsonBody(request),
        );
        if (!parsed.success) {
          throw validationError(parsed.error.issues[0]?.message, "逐字稿要求格式不正確。");
        }
        const result = await options.audioService.revealTranscript(accessToken, parsed.data);
        return jsonResponse(revealListeningTranscriptResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    if (request.method === "POST" && url.pathname === "/listening/submit-dictation") {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const parsed = submitDictationRequestSchema.safeParse(await readJsonBody(request));
        if (!parsed.success) {
          throw validationError(parsed.error.issues[0]?.message, "聽寫提交格式不正確。");
        }
        const result = await options.audioService.submitDictation(accessToken, parsed.data);
        return jsonResponse(submitDictationResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    if (request.method === "POST" && url.pathname === "/audio/transcribe") {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const parsed = transcribeRequestSchema.safeParse(await readJsonBody(request));
        if (!parsed.success) {
          throw validationError(parsed.error.issues[0]?.message, "錄音轉錄要求格式不正確。");
        }
        const result = await options.audioService.transcribe(accessToken, parsed.data);
        return jsonResponse(transcribeResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    if (request.method === "POST" && url.pathname === "/admin/ai/exercise-drafts") {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const parsed = generateExerciseDraftRequestSchema.safeParse(await readJsonBody(request));
        if (!parsed.success) {
          throw validationError(parsed.error.issues[0]?.message, "AI 題目草稿要求格式不正確。");
        }
        const result = await options.contentGenerationService.generateExerciseDraft(
          accessToken,
          parsed.data,
        );
        return jsonResponse(generateExerciseDraftResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    const speakingDeleteMatch = url.pathname.match(
      /^\/speaking\/submissions\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i,
    );
    if (request.method === "DELETE" && speakingDeleteMatch?.[1]) {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const result = await options.audioService.deleteSpeakingSubmission(
          accessToken,
          speakingDeleteMatch[1],
        );
        return jsonResponse(deleteSpeakingSubmissionResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    return errorResponse(
      new ApiError("NOT_FOUND", "找不到要求的 API 路徑。", 404, false),
      createRequestId(),
    );
  };
}

function readBearerToken(header: string | null): string {
  if (!header?.startsWith("Bearer ") || header.length <= 7) {
    throw new ApiError("UNAUTHORIZED", "請先登入再使用此功能。", 401, false);
  }
  return header.slice(7).trim();
}

function validationError(message: string | undefined, fallback: string): ApiError {
  return new ApiError("VALIDATION_ERROR", message ?? fallback, 400, false);
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown;
  } catch {
    throw new ApiError("VALIDATION_ERROR", "要求內容必須是有效 JSON。", 400, false);
  }
}

function errorResponse(error: ApiError, requestId: string): Response {
  const payload = apiErrorResponseSchema.parse({
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      requestId,
    },
  });
  return jsonResponse(payload, error.status);
}

function jsonResponse(payload: unknown, status: number): Response {
  return withCors(
    new Response(JSON.stringify(payload), {
      status,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      },
    }),
  );
}

function withCors(response: Response): Response {
  response.headers.set("access-control-allow-origin", "*");
  response.headers.set("access-control-allow-headers", "authorization, content-type");
  response.headers.set("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
  return response;
}
