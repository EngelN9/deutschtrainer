import { gradeFixedExercise } from "@deutschtrainer/grading";
import type { ReviewItem } from "@deutschtrainer/shared-types";
import type {
  CompleteReviewRequest,
  CompleteReviewResponse,
  CourseListRequest,
  CourseListResponse,
  ProgressResponse,
  ReviewQueueRequest,
  ReviewQueueResponse,
  SubmitAttemptRequest,
  SubmitAttemptResponse,
} from "@deutschtrainer/validation";
import { ApiError } from "../errors";
import type {
  AuthenticatedLearningUser,
  LearningDataRepository,
  LearningDataServiceContract,
  RecordedFixedAttempt,
} from "./types";

interface LearningDataServiceOptions {
  repository: LearningDataRepository;
  privateRequestsPerMinute?: number;
  now?: () => Date;
}

export class LearningDataService implements LearningDataServiceContract {
  private readonly repository: LearningDataRepository;
  private readonly privateRequestsPerMinute: number;
  private readonly now: () => Date;
  private readonly requestWindows = new Map<string, number[]>();

  constructor(options: LearningDataServiceOptions) {
    this.repository = options.repository;
    this.privateRequestsPerMinute = options.privateRequestsPerMinute ?? 60;
    this.now = options.now ?? (() => new Date());
  }

  async listCourses(request: CourseListRequest): Promise<CourseListResponse> {
    return this.repository.listPublishedCatalog(request.level);
  }

  async getCourse(courseId: string) {
    const course = await this.repository.getPublishedCourse(courseId);
    if (!course) {
      throw new ApiError("CONTENT_NOT_PUBLISHED", "找不到已發布的課程。", 404, false);
    }
    return { course };
  }

  async getLesson(lessonId: string) {
    const lesson = await this.repository.getPublishedLesson(lessonId);
    if (!lesson) {
      throw new ApiError("CONTENT_NOT_PUBLISHED", "找不到已發布的課堂。", 404, false);
    }
    return { lesson };
  }

  async submitAttempt(
    accessToken: string,
    request: SubmitAttemptRequest,
  ): Promise<SubmitAttemptResponse> {
    const learner = await this.requireLearner(accessToken);
    return this.gradeAndRecord(learner, request);
  }

  async getProgress(accessToken: string): Promise<ProgressResponse> {
    const learner = await this.requireLearner(accessToken);
    const snapshot = await this.repository.getLearningRecords(learner.profileId);
    return { ...snapshot, generatedAt: this.now().toISOString() };
  }

  async getReviews(accessToken: string, request: ReviewQueueRequest): Promise<ReviewQueueResponse> {
    const learner = await this.requireLearner(accessToken);
    return this.repository.getReviews(learner.profileId, request);
  }

  async completeReview(
    accessToken: string,
    reviewId: string,
    request: CompleteReviewRequest,
  ): Promise<CompleteReviewResponse> {
    const learner = await this.requireLearner(accessToken);
    const review = await this.repository.getReview(learner.profileId, reviewId);
    if (!review) {
      throw new ApiError("NOT_FOUND", "找不到這筆複習項目。", 404, false);
    }

    const existing = await this.repository.findAttemptByIdempotency(
      learner.profileId,
      request.idempotencyKey,
    );
    const isExactReplay =
      existing?.exerciseId === review.exerciseId &&
      existing.mode === "review" &&
      review.completedAttemptId === existing.attemptId;
    if (existing && !isExactReplay) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "這個 idempotency key 已用於其他題目或作答流程。",
        409,
        false,
      );
    }
    if (review.status !== "scheduled" && !isExactReplay) {
      throw new ApiError("VALIDATION_ERROR", "這筆複習已經完成或取消。", 409, false);
    }
    if (!existing && new Date(review.scheduledAt).getTime() > this.now().getTime()) {
      throw new ApiError("VALIDATION_ERROR", "這筆複習尚未到期。", 409, false);
    }

    const attempt = existing
      ? toReplayResponse(existing)
      : await this.gradeAndRecord(
          learner,
          {
            exerciseId: review.exerciseId,
            answer: request.answer,
            durationMs: request.durationMs,
            usedHint: request.usedHint,
            mode: "lesson",
            idempotencyKey: request.idempotencyKey,
          },
          review,
        );
    const nextReviewAt = await this.repository.getNextScheduledReviewAt(
      learner.profileId,
      review.skillId,
      review.exerciseId,
    );

    return {
      reviewId,
      status: "completed",
      attempt,
      ...(nextReviewAt ? { nextReviewAt } : {}),
    };
  }

  private async gradeAndRecord(
    learner: AuthenticatedLearningUser,
    request: SubmitAttemptRequest,
    review?: ReviewItem,
  ): Promise<SubmitAttemptResponse> {
    const existing = await this.repository.findAttemptByIdempotency(
      learner.profileId,
      request.idempotencyKey,
    );
    if (existing) {
      const expectedMode = review ? "review" : request.mode;
      if (existing.exerciseId !== request.exerciseId || existing.mode !== expectedMode) {
        throw new ApiError(
          "VALIDATION_ERROR",
          "這個 idempotency key 已用於其他題目或作答流程。",
          409,
          false,
        );
      }
      return toReplayResponse(existing);
    }

    const exercise = await this.repository.getFixedExercise(request.exerciseId);
    if (!exercise) {
      throw new ApiError("CONTENT_NOT_PUBLISHED", "找不到可作答的已發布固定題。", 404, false);
    }
    if (review && review.exerciseId !== exercise.id) {
      throw new ApiError("VALIDATION_ERROR", "複習項目與題目不一致。", 400, false);
    }

    const gradingResult = gradeFixedExercise(exercise, request.answer);
    const recorded = await this.repository.recordFixedAttempt({
      learnerId: learner.profileId,
      request: { ...request, mode: review ? "lesson" : request.mode },
      gradingResult,
      ...(review ? { reviewId: review.id } : {}),
    });
    return toSubmitAttemptResponse(recorded, gradingResult);
  }

  private async requireLearner(accessToken: string): Promise<AuthenticatedLearningUser> {
    const learner = await this.repository.authenticate(accessToken);
    if (!learner) {
      throw new ApiError("UNAUTHORIZED", "登入狀態已失效，請重新登入。", 401, false);
    }
    this.assertRateLimit(learner.profileId);
    return learner;
  }

  private assertRateLimit(profileId: string): void {
    const now = this.now().getTime();
    const active = (this.requestWindows.get(profileId) ?? []).filter(
      (timestamp) => timestamp > now - 60_000,
    );
    if (active.length >= this.privateRequestsPerMinute) {
      throw new ApiError("RATE_LIMITED", "操作過於頻繁，請稍後再試。", 429, true);
    }
    active.push(now);
    this.requestWindows.set(profileId, active);
  }
}

function toSubmitAttemptResponse(
  recorded: RecordedFixedAttempt,
  gradingResult: SubmitAttemptResponse["gradingResult"],
): SubmitAttemptResponse {
  return {
    attemptId: recorded.attemptId,
    lessonId: recorded.lessonId,
    gradingResult,
    completionPercent: recorded.completionPercent,
    scheduledReviewCount: recorded.scheduledReviewCount,
    idempotentReplay: recorded.idempotentReplay,
  };
}

function toReplayResponse(existing: {
  attemptId: string;
  exerciseId: string;
  lessonId: string;
  gradingResult: SubmitAttemptResponse["gradingResult"];
  completionPercent: number;
}): SubmitAttemptResponse {
  return {
    attemptId: existing.attemptId,
    lessonId: existing.lessonId,
    gradingResult: existing.gradingResult,
    completionPercent: existing.completionPercent,
    scheduledReviewCount: 0,
    idempotentReplay: true,
  };
}
