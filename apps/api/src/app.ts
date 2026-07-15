import { randomUUID } from "node:crypto";
import {
  apiErrorResponseSchema,
  audioLearningWorkspaceResponseSchema,
  completeReviewRequestSchema,
  completeReviewResponseSchema,
  courseDetailResponseSchema,
  courseListRequestSchema,
  courseListResponseSchema,
  databaseUuidSchema,
  deleteWritingSubmissionResponseSchema,
  deleteSpeakingSubmissionResponseSchema,
  evaluateResponseRequestSchema,
  evaluateResponseResponseSchema,
  evaluateWritingRequestSchema,
  evaluateWritingResponseSchema,
  generateExerciseDraftRequestSchema,
  generateExerciseDraftResponseSchema,
  grammarTopicDetailResponseSchema,
  grammarTopicListRequestSchema,
  grammarTopicListResponseSchema,
  lessonDetailResponseSchema,
  listeningActivityRequestSchema,
  listeningActivityResponseSchema,
  notificationPreferencesResponseSchema,
  onboardingRequestSchema,
  progressResponseSchema,
  revealListeningTranscriptRequestSchema,
  revealListeningTranscriptResponseSchema,
  reviewQueueRequestSchema,
  reviewQueueResponseSchema,
  submitAttemptRequestSchema,
  submitAttemptResponseSchema,
  submitDictationRequestSchema,
  submitDictationResponseSchema,
  textToSpeechRequestSchema,
  textToSpeechResponseSchema,
  transcribeRequestSchema,
  transcribeResponseSchema,
  updateNotificationPreferencesRequestSchema,
  userSettingsResponseSchema,
  vocabularyDetailResponseSchema,
  vocabularyListRequestSchema,
  vocabularyListResponseSchema,
  writingWorkspaceResponseSchema,
} from "@deutschtrainer/validation";
import type { AudioLearningServiceContract } from "./audio/types";
import type { ContentGenerationServiceContract } from "./content-generation/types";
import { ApiError, toApiError } from "./errors";
import type { EvaluationService } from "./evaluation/types";
import type { LearningDataServiceContract } from "./learning-data/types";
import type { KnowledgeServiceContract } from "./knowledge/types";
import type { SettingsServiceContract } from "./settings/types";
import type { WritingService } from "./writing/types";

export interface ApiHandlerOptions {
  evaluationService: EvaluationService;
  writingService: WritingService;
  audioService: AudioLearningServiceContract;
  contentGenerationService: ContentGenerationServiceContract;
  learningDataService: LearningDataServiceContract;
  knowledgeService: KnowledgeServiceContract;
  settingsService: SettingsServiceContract;
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

    if (request.method === "GET" && url.pathname === "/courses") {
      const requestId = createRequestId();
      try {
        const parsed = courseListRequestSchema.safeParse({
          level: url.searchParams.get("level") ?? undefined,
        });
        if (!parsed.success) {
          throw validationError(parsed.error.issues[0]?.message, "課程篩選格式不正確。");
        }
        const result = await options.learningDataService.listCourses(parsed.data);
        return jsonResponse(courseListResponseSchema.parse(result), 200, {
          cacheControl: "public, max-age=60, stale-while-revalidate=300",
        });
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    const courseDetailMatch = url.pathname.match(/^\/courses\/([^/]+)$/);
    if (request.method === "GET" && courseDetailMatch?.[1]) {
      const requestId = createRequestId();
      try {
        const courseId = parseDatabaseUuid(courseDetailMatch[1], "課程 ID 格式不正確。");
        const result = await options.learningDataService.getCourse(courseId);
        return jsonResponse(courseDetailResponseSchema.parse(result), 200, {
          cacheControl: "public, max-age=60, stale-while-revalidate=300",
        });
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    const lessonDetailMatch = url.pathname.match(/^\/lessons\/([^/]+)$/);
    if (request.method === "GET" && lessonDetailMatch?.[1]) {
      const requestId = createRequestId();
      try {
        const lessonId = parseDatabaseUuid(lessonDetailMatch[1], "課堂 ID 格式不正確。");
        const result = await options.learningDataService.getLesson(lessonId);
        return jsonResponse(lessonDetailResponseSchema.parse(result), 200, {
          cacheControl: "public, max-age=60, stale-while-revalidate=300",
        });
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    if (request.method === "GET" && url.pathname === "/vocabulary") {
      const requestId = createRequestId();
      try {
        const parsed = vocabularyListRequestSchema.safeParse({
          level: readQueryValue(url, "level"),
          query: readQueryValue(url, "query"),
          partOfSpeech: readQueryValue(url, "partOfSpeech"),
          register: readQueryValue(url, "register"),
          region: readQueryValue(url, "region"),
          page: readQueryNumber(url, "page"),
          pageSize: readQueryNumber(url, "pageSize"),
        });
        if (!parsed.success) {
          throw validationError(parsed.error.issues[0]?.message, "單字庫篩選格式不正確。");
        }
        const result = await options.knowledgeService.listVocabulary(parsed.data);
        return jsonResponse(vocabularyListResponseSchema.parse(result), 200, {
          cacheControl: "public, max-age=60, stale-while-revalidate=300",
        });
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    const vocabularyDetailMatch = url.pathname.match(/^\/vocabulary\/([^/]+)$/);
    if (request.method === "GET" && vocabularyDetailMatch?.[1]) {
      const requestId = createRequestId();
      try {
        const itemId = parseDatabaseUuid(vocabularyDetailMatch[1], "單字 ID 格式不正確。");
        const result = await options.knowledgeService.getVocabularyItem(itemId);
        return jsonResponse(vocabularyDetailResponseSchema.parse(result), 200, {
          cacheControl: "public, max-age=60, stale-while-revalidate=300",
        });
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    if (request.method === "GET" && url.pathname === "/grammar-topics") {
      const requestId = createRequestId();
      try {
        const parsed = grammarTopicListRequestSchema.safeParse({
          level: readQueryValue(url, "level"),
          query: readQueryValue(url, "query"),
          difficulty: readQueryNumber(url, "difficulty"),
          page: readQueryNumber(url, "page"),
          pageSize: readQueryNumber(url, "pageSize"),
        });
        if (!parsed.success) {
          throw validationError(parsed.error.issues[0]?.message, "文法庫篩選格式不正確。");
        }
        const result = await options.knowledgeService.listGrammarTopics(parsed.data);
        return jsonResponse(grammarTopicListResponseSchema.parse(result), 200, {
          cacheControl: "public, max-age=60, stale-while-revalidate=300",
        });
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    const grammarDetailMatch = url.pathname.match(/^\/grammar-topics\/([^/]+)$/);
    if (request.method === "GET" && grammarDetailMatch?.[1]) {
      const requestId = createRequestId();
      try {
        const topicId = parseDatabaseUuid(grammarDetailMatch[1], "文法主題 ID 格式不正確。");
        const result = await options.knowledgeService.getGrammarTopic(topicId);
        return jsonResponse(grammarTopicDetailResponseSchema.parse(result), 200, {
          cacheControl: "public, max-age=60, stale-while-revalidate=300",
        });
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    if (request.method === "POST" && url.pathname === "/attempts") {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const parsed = submitAttemptRequestSchema.safeParse(await readJsonBody(request));
        if (!parsed.success) {
          throw validationError(parsed.error.issues[0]?.message, "作答提交格式不正確。");
        }
        const result = await options.learningDataService.submitAttempt(accessToken, parsed.data);
        return jsonResponse(submitAttemptResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    if (request.method === "GET" && url.pathname === "/users/me/progress") {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const result = await options.learningDataService.getProgress(accessToken);
        return jsonResponse(progressResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    if (request.method === "GET" && url.pathname === "/users/me/reviews") {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const parsed = reviewQueueRequestSchema.safeParse({
          status: url.searchParams.get("status") ?? undefined,
          dueBefore: url.searchParams.get("dueBefore") ?? undefined,
          limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined,
        });
        if (!parsed.success) {
          throw validationError(parsed.error.issues[0]?.message, "複習篩選格式不正確。");
        }
        const result = await options.learningDataService.getReviews(accessToken, parsed.data);
        return jsonResponse(reviewQueueResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    const completeReviewMatch = url.pathname.match(/^\/reviews\/([^/]+)\/complete$/);
    if (request.method === "POST" && completeReviewMatch?.[1]) {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const reviewId = parseDatabaseUuid(completeReviewMatch[1], "複習項目 ID 格式不正確。");
        const parsed = completeReviewRequestSchema.safeParse(await readJsonBody(request));
        if (!parsed.success) {
          throw validationError(parsed.error.issues[0]?.message, "複習提交格式不正確。");
        }
        const result = await options.learningDataService.completeReview(
          accessToken,
          reviewId,
          parsed.data,
        );
        return jsonResponse(completeReviewResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    if (request.method === "GET" && url.pathname === "/users/me/settings") {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const result = await options.settingsService.getSettings(accessToken);
        return jsonResponse(userSettingsResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    if (request.method === "PUT" && url.pathname === "/users/me/onboarding") {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const parsed = onboardingRequestSchema.safeParse(await readJsonBody(request));
        if (!parsed.success) {
          throw validationError(parsed.error.issues[0]?.message, "初次設定格式不正確。");
        }
        const result = await options.settingsService.completeOnboarding(accessToken, parsed.data);
        return jsonResponse(userSettingsResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    if (request.method === "PUT" && url.pathname === "/users/me/notification-preferences") {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const parsed = updateNotificationPreferencesRequestSchema.safeParse(
          await readJsonBody(request),
        );
        if (!parsed.success) {
          throw validationError(parsed.error.issues[0]?.message, "通知偏好格式不正確。");
        }
        const result = await options.settingsService.updateNotificationPreferences(
          accessToken,
          parsed.data,
        );
        return jsonResponse(notificationPreferencesResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    if (request.method === "GET" && url.pathname === "/users/me/writing") {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const result = await options.writingService.getWorkspace(accessToken);
        return jsonResponse(writingWorkspaceResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    const deleteWritingMatch = url.pathname.match(/^\/writing\/submissions\/([^/]+)$/);
    if (request.method === "DELETE" && deleteWritingMatch?.[1]) {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const submissionId = parseDatabaseUuid(deleteWritingMatch[1], "作文提交 ID 格式不正確。");
        const result = await options.writingService.deleteSubmission(accessToken, submissionId);
        return jsonResponse(deleteWritingSubmissionResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    if (request.method === "GET" && url.pathname === "/users/me/audio-learning") {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const result = await options.audioService.getWorkspace(accessToken);
        return jsonResponse(audioLearningWorkspaceResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
    }

    if (request.method === "POST" && url.pathname === "/listening/activity") {
      const requestId = createRequestId();
      try {
        const accessToken = readBearerToken(request.headers.get("authorization"));
        const parsed = listeningActivityRequestSchema.safeParse(await readJsonBody(request));
        if (!parsed.success) {
          throw validationError(parsed.error.issues[0]?.message, "聽力操作格式不正確。");
        }
        const result = await options.audioService.recordActivity(accessToken, parsed.data);
        return jsonResponse(listeningActivityResponseSchema.parse(result), 200);
      } catch (error) {
        return errorResponse(toApiError(error), requestId);
      }
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

function parseDatabaseUuid(value: string, message: string): string {
  const parsed = databaseUuidSchema.safeParse(value);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", message, 400, false);
  }
  return parsed.data;
}

function readQueryValue(url: URL, key: string): string | undefined {
  const value = url.searchParams.get(key)?.trim();
  return value ? value : undefined;
}

function readQueryNumber(url: URL, key: string): number | undefined {
  const value = readQueryValue(url, key);
  return value === undefined ? undefined : Number(value);
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

function jsonResponse(
  payload: unknown,
  status: number,
  options: { cacheControl?: string } = {},
): Response {
  return withCors(
    new Response(JSON.stringify(payload), {
      status,
      headers: {
        "cache-control": options.cacheControl ?? "no-store",
        "content-type": "application/json; charset=utf-8",
      },
    }),
  );
}

function withCors(response: Response): Response {
  response.headers.set("access-control-allow-origin", "*");
  response.headers.set("access-control-allow-headers", "authorization, content-type");
  response.headers.set("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS");
  return response;
}
