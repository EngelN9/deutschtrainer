import { randomUUID } from "node:crypto";
import {
  apiErrorResponseSchema,
  evaluateResponseRequestSchema,
  evaluateResponseResponseSchema,
  evaluateWritingRequestSchema,
  evaluateWritingResponseSchema,
} from "@deutschtrainer/validation";
import { ApiError, toApiError } from "./errors";
import type { EvaluationService } from "./evaluation/types";
import type { WritingService } from "./writing/types";

export interface ApiHandlerOptions {
  evaluationService: EvaluationService;
  writingService: WritingService;
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

    return errorResponse(
      new ApiError("NOT_FOUND", "找不到要求的 API 路徑。", 404, false),
      createRequestId(),
    );
  };
}

function readBearerToken(header: string | null): string {
  if (!header?.startsWith("Bearer ") || header.length <= 7) {
    throw new ApiError("UNAUTHORIZED", "請先登入再使用 AI 批改。", 401, false);
  }
  return header.slice(7).trim();
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
  response.headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  return response;
}
