import type { GradingResult } from "@deutschtrainer/grading";
import type {
  Attempt,
  CatalogCourse,
  CefrLevel,
  FixedExercise,
  LearningRecordSnapshot,
  LessonContent,
  ReviewItem,
} from "@deutschtrainer/shared-types";
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

export interface AuthenticatedLearningUser {
  authUserId: string;
  profileId: string;
}

export interface RecordFixedAttemptInput {
  learnerId: string;
  request: SubmitAttemptRequest;
  gradingResult: GradingResult;
  reviewId?: string;
}

export interface StoredFixedAttempt {
  attemptId: string;
  exerciseId: string;
  lessonId: string;
  mode: Attempt["mode"];
  gradingResult: GradingResult;
  completionPercent: number;
}

export interface StoredReview extends ReviewItem {
  completedAttemptId?: string;
}

export interface RecordedFixedAttempt {
  attemptId: string;
  lessonId: string;
  completionPercent: number;
  scheduledReviewCount: number;
  idempotentReplay: boolean;
}

export interface LearningDataRepository {
  authenticate(accessToken: string): Promise<AuthenticatedLearningUser | undefined>;
  listPublishedCatalog(level?: CefrLevel): Promise<CourseListResponse>;
  getPublishedCourse(courseId: string): Promise<CatalogCourse | undefined>;
  getPublishedLesson(lessonId: string): Promise<LessonContent | undefined>;
  getFixedExercise(exerciseId: string): Promise<FixedExercise | undefined>;
  findAttemptByIdempotency(
    learnerId: string,
    idempotencyKey: string,
  ): Promise<StoredFixedAttempt | undefined>;
  recordFixedAttempt(input: RecordFixedAttemptInput): Promise<RecordedFixedAttempt>;
  getLearningRecords(learnerId: string): Promise<LearningRecordSnapshot>;
  getReviews(learnerId: string, request: ReviewQueueRequest): Promise<ReviewQueueResponse>;
  getReview(learnerId: string, reviewId: string): Promise<StoredReview | undefined>;
  getNextScheduledReviewAt(
    learnerId: string,
    skillId: string,
    exerciseId: string,
  ): Promise<string | undefined>;
}

export interface LearningDataServiceContract {
  listCourses(request: CourseListRequest): Promise<CourseListResponse>;
  getCourse(courseId: string): Promise<{ course: CatalogCourse }>;
  getLesson(lessonId: string): Promise<{ lesson: LessonContent }>;
  submitAttempt(accessToken: string, request: SubmitAttemptRequest): Promise<SubmitAttemptResponse>;
  getProgress(accessToken: string): Promise<ProgressResponse>;
  getReviews(accessToken: string, request: ReviewQueueRequest): Promise<ReviewQueueResponse>;
  completeReview(
    accessToken: string,
    reviewId: string,
    request: CompleteReviewRequest,
  ): Promise<CompleteReviewResponse>;
}
