import { describe, expect, it } from "@jest/globals";
import type { GradingResult } from "@deutschtrainer/grading";
import type {
  CatalogCourse,
  FixedExercise,
  LearningRecordSnapshot,
  LessonContent,
  ReviewItem,
} from "@deutschtrainer/shared-types";
import type {
  CourseListResponse,
  ReviewQueueRequest,
  ReviewQueueResponse,
} from "@deutschtrainer/validation";
import { ApiError } from "../errors";
import { LearningDataService } from "./learningDataService";
import type {
  AuthenticatedLearningUser,
  LearningDataRepository,
  RecordedFixedAttempt,
  RecordFixedAttemptInput,
  StoredFixedAttempt,
  StoredReview,
} from "./types";

const exercise: FixedExercise = {
  id: "bbd6554d-7c7f-0909-d72a-106769464259",
  level: "B1",
  type: "fill_blank",
  title: "連接詞填空",
  instructionZhTw: "填入正確答案。",
  promptDe: "Ich bleibe zu Hause, ___ es regnet.",
  skillIds: ["B1.grammar.weil"],
  grammarTopicIds: [],
  vocabularyIds: [],
  estimatedSeconds: 30,
  difficulty: 2,
  sourceType: "human",
  reviewStatus: "approved",
  version: 1,
  answer: { acceptedAnswers: ["weil"] },
  gradingPolicy: {
    acceptedAlternatives: [],
    allowPartialCredit: false,
    caseSensitive: false,
    ignorePunctuation: true,
    normalizeGermanCharacters: false,
  },
};

describe("LearningDataService", () => {
  it("grades raw fixed answers on the server before persisting", async () => {
    const repository = new FakeLearningDataRepository();
    const service = new LearningDataService({ repository });

    const result = await service.submitAttempt("valid-token", {
      exerciseId: exercise.id,
      answer: "denn",
      durationMs: 1200,
      usedHint: false,
      mode: "lesson",
      idempotencyKey: "phase9-authoritative-grade",
    });

    expect(result.gradingResult.score).toBe(0);
    expect(result.gradingResult.isCorrect).toBe(false);
    expect(repository.lastRecorded?.gradingResult.score).toBe(0);
  });

  it("preserves a valid offline submission timestamp", async () => {
    const repository = new FakeLearningDataRepository();
    const service = new LearningDataService({
      repository,
      now: () => new Date("2026-07-15T05:00:00.000Z"),
    });

    await service.submitAttempt("valid-token", {
      exerciseId: exercise.id,
      answer: "weil",
      durationMs: 1200,
      usedHint: false,
      mode: "lesson",
      idempotencyKey: "phase12-offline-timestamp",
      submittedAt: "2026-07-14T05:00:00.000Z",
    });

    expect(repository.lastRecorded?.request.submittedAt).toBe("2026-07-14T05:00:00.000Z");
  });

  it("retains a stale downloaded exercise as a conflict", async () => {
    const service = new LearningDataService({ repository: new FakeLearningDataRepository() });

    await expect(
      service.submitAttempt("valid-token", {
        exerciseId: exercise.id,
        exerciseVersion: exercise.version + 1,
        answer: "weil",
        durationMs: 1200,
        usedHint: false,
        mode: "lesson",
        idempotencyKey: "phase12-stale-exercise",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 409 });
  });

  it.each(["2026-06-14T04:59:59.000Z", "2026-07-15T05:05:01.000Z"])(
    "rejects an offline timestamp outside the accepted window: %s",
    async (submittedAt) => {
      const service = new LearningDataService({
        repository: new FakeLearningDataRepository(),
        now: () => new Date("2026-07-15T05:00:00.000Z"),
      });

      await expect(
        service.submitAttempt("valid-token", {
          exerciseId: exercise.id,
          answer: "weil",
          durationMs: 1200,
          usedHint: false,
          mode: "lesson",
          idempotencyKey: `phase12-invalid-${submittedAt}`,
          submittedAt,
        }),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
    },
  );

  it("replays the first stored result for a reused idempotency key", async () => {
    const repository = new FakeLearningDataRepository();
    repository.storedAttempt = {
      attemptId: "cea085c4-11cd-4dcd-b852-70db65caaeb4",
      exerciseId: exercise.id,
      lessonId: "7201fcca-f0c9-9bb7-218a-192849e5f84d",
      mode: "lesson",
      completionPercent: 40,
      gradingResult: gradeResult(100, true, "weil"),
    };
    const service = new LearningDataService({ repository });

    const result = await service.submitAttempt("valid-token", {
      exerciseId: exercise.id,
      answer: "different answer",
      durationMs: 1200,
      usedHint: false,
      mode: "lesson",
      idempotencyKey: "phase9-authoritative-grade",
    });

    expect(result.idempotentReplay).toBe(true);
    expect(result.gradingResult.score).toBe(100);
    expect(repository.lastRecorded).toBeUndefined();
  });

  it("rejects an idempotency key that belongs to a different exercise", async () => {
    const repository = new FakeLearningDataRepository();
    repository.storedAttempt = {
      attemptId: "cea085c4-11cd-4dcd-b852-70db65caaeb4",
      exerciseId: "abd6554d-7c7f-0909-d72a-106769464259",
      lessonId: "7201fcca-f0c9-9bb7-218a-192849e5f84d",
      mode: "lesson",
      completionPercent: 40,
      gradingResult: gradeResult(100, true, "weil"),
    };
    const service = new LearningDataService({ repository });

    await expect(
      service.submitAttempt("valid-token", {
        exerciseId: exercise.id,
        answer: "weil",
        durationMs: 1200,
        usedHint: false,
        mode: "lesson",
        idempotencyKey: "phase9-conflicting-key",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 409 });
  });

  it("rejects private progress without a valid learner", async () => {
    const service = new LearningDataService({ repository: new FakeLearningDataRepository() });

    await expect(service.getProgress("invalid-token")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
  });

  it("returns CONTENT_NOT_PUBLISHED for missing course content", async () => {
    const service = new LearningDataService({ repository: new FakeLearningDataRepository() });

    await expect(service.getCourse("00000000-0000-0000-0000-000000000001")).rejects.toMatchObject({
      code: "CONTENT_NOT_PUBLISHED",
      status: 404,
    });
  });

  it("completes an owned review through an authoritative review attempt", async () => {
    const repository = new FakeLearningDataRepository();
    repository.review = createReview();
    repository.nextReviewAt = "2026-07-21T05:00:00.000+00:00";
    const service = new LearningDataService({ repository });

    const result = await service.completeReview("valid-token", repository.review.id, {
      answer: "weil",
      durationMs: 900,
      usedHint: false,
      idempotencyKey: "phase9-review-completion",
    });

    expect(result.status).toBe("completed");
    expect(result.attempt.gradingResult.isCorrect).toBe(true);
    expect(repository.lastRecorded?.reviewId).toBe(repository.review.id);
    expect(result.nextReviewAt).toBe(repository.nextReviewAt);
  });

  it("does not complete a review before it is due", async () => {
    const repository = new FakeLearningDataRepository();
    repository.review = {
      ...createReview(),
      scheduledAt: "2026-07-15T05:00:00.000+00:00",
    };
    const service = new LearningDataService({
      repository,
      now: () => new Date("2026-07-14T05:00:00.000Z"),
    });

    await expect(
      service.completeReview("valid-token", repository.review.id, {
        answer: "weil",
        durationMs: 900,
        usedHint: false,
        idempotencyKey: "phase9-future-review",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 409 });
  });

  it("rejects a lesson attempt idempotency key during review completion", async () => {
    const repository = new FakeLearningDataRepository();
    repository.review = createReview();
    repository.storedAttempt = {
      attemptId: "cea085c4-11cd-4dcd-b852-70db65caaeb4",
      exerciseId: exercise.id,
      lessonId: "7201fcca-f0c9-9bb7-218a-192849e5f84d",
      mode: "lesson",
      completionPercent: 40,
      gradingResult: gradeResult(100, true, "weil"),
    };
    const service = new LearningDataService({ repository });

    await expect(
      service.completeReview("valid-token", repository.review.id, {
        answer: "weil",
        durationMs: 900,
        usedHint: false,
        idempotencyKey: "phase9-cross-flow-key",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 409 });
  });

  it("replays only the attempt that completed the requested review", async () => {
    const repository = new FakeLearningDataRepository();
    const attemptId = "cea085c4-11cd-4dcd-b852-70db65caaeb4";
    repository.review = {
      ...createReview(),
      status: "completed",
      completedAttemptId: attemptId,
      completedAt: "2026-07-14T05:01:00.000+00:00",
    };
    repository.storedAttempt = {
      attemptId,
      exerciseId: exercise.id,
      lessonId: "7201fcca-f0c9-9bb7-218a-192849e5f84d",
      mode: "review",
      completionPercent: 40,
      gradingResult: gradeResult(100, true, "weil"),
    };
    const service = new LearningDataService({ repository });

    const result = await service.completeReview("valid-token", repository.review.id, {
      answer: "different answer",
      durationMs: 900,
      usedHint: false,
      idempotencyKey: "phase9-review-replay",
    });

    expect(result.attempt.idempotentReplay).toBe(true);
    expect(result.attempt.attemptId).toBe(attemptId);
    expect(repository.lastRecorded).toBeUndefined();
  });

  it("enforces the configured private request window", async () => {
    const service = new LearningDataService({
      repository: new FakeLearningDataRepository(),
      privateRequestsPerMinute: 1,
      now: () => new Date("2026-07-14T05:00:00.000Z"),
    });

    await service.getProgress("valid-token");
    await expect(service.getProgress("valid-token")).rejects.toBeInstanceOf(ApiError);
    await expect(service.getProgress("valid-token")).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
    });
  });
});

class FakeLearningDataRepository implements LearningDataRepository {
  lastRecorded?: RecordFixedAttemptInput;
  nextReviewAt?: string;
  review?: StoredReview;
  storedAttempt?: StoredFixedAttempt;

  async authenticate(accessToken: string): Promise<AuthenticatedLearningUser | undefined> {
    return accessToken === "valid-token"
      ? {
          authUserId: "0d377460-50a3-4c7b-97f6-5d0a6d72e5ce",
          profileId: "1d377460-50a3-4c7b-97f6-5d0a6d72e5ce",
        }
      : undefined;
  }

  async listPublishedCatalog(): Promise<CourseListResponse> {
    return { source: "api", courses: [] };
  }

  async getPublishedCourse(): Promise<CatalogCourse | undefined> {
    return undefined;
  }

  async getPublishedLesson(): Promise<LessonContent | undefined> {
    return undefined;
  }

  async getFixedExercise(): Promise<FixedExercise | undefined> {
    return exercise;
  }

  async findAttemptByIdempotency(): Promise<StoredFixedAttempt | undefined> {
    return this.storedAttempt;
  }

  async recordFixedAttempt(input: RecordFixedAttemptInput): Promise<RecordedFixedAttempt> {
    this.lastRecorded = input;
    return {
      attemptId: "cea085c4-11cd-4dcd-b852-70db65caaeb4",
      lessonId: "7201fcca-f0c9-9bb7-218a-192849e5f84d",
      completionPercent: 20,
      scheduledReviewCount: 1,
      idempotentReplay: false,
    };
  }

  async getLearningRecords(): Promise<LearningRecordSnapshot> {
    return emptySnapshot();
  }

  async getReviews(_learnerId: string, _request: ReviewQueueRequest): Promise<ReviewQueueResponse> {
    return { reviews: this.review ? [this.review] : [], skillNames: {} };
  }

  async getReview(): Promise<StoredReview | undefined> {
    return this.review;
  }

  async getNextScheduledReviewAt(): Promise<string | undefined> {
    return this.nextReviewAt;
  }
}

function gradeResult(score: number, isCorrect: boolean, answer: string): GradingResult {
  return {
    score,
    isCorrect,
    normalizedAnswer: answer,
    acceptedAnswer: "weil",
    details: { matched: isCorrect },
  };
}

function createReview(): ReviewItem {
  return {
    id: "9ea085c4-11cd-4dcd-b852-70db65caaeb4",
    userId: "1d377460-50a3-4c7b-97f6-5d0a6d72e5ce",
    skillId: "2d377460-50a3-4c7b-97f6-5d0a6d72e5ce",
    exerciseId: exercise.id,
    priority: 100,
    scheduledAt: "2026-07-14T05:00:00.000+00:00",
    reason: "incorrect_answer",
    intervalDays: 0,
    easeFactor: 2.3,
    status: "scheduled",
    sourceAttemptId: "cea085c4-11cd-4dcd-b852-70db65caaeb4",
  };
}

function emptySnapshot(): LearningRecordSnapshot {
  return {
    attempts: [],
    errors: [],
    mastery: [],
    reviews: [],
    lessonProgress: [],
    skillNames: {},
  };
}
