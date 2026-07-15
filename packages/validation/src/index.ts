import { z } from "zod";
import {
  aiEvaluationFeedbackSchema,
  generatedExerciseDraftSchema,
  writingFeedbackSchema,
} from "@deutschtrainer/ai-schemas";
import {
  AI_GENERATED_EXERCISE_TYPES,
  AI_EVALUATED_EXERCISE_TYPES,
  AUDIO_VOICES,
  ERROR_TYPES,
  EXERCISE_TYPES,
  FIXED_EXERCISE_TYPES,
  LISTENING_KINDS,
  SKILL_CATEGORIES,
  SPEAKING_SUBMISSION_STATUSES,
  SUPPORTED_LEVELS,
  WRITING_TYPES,
} from "@deutschtrainer/shared-types";

export const cefrLevelSchema = z.enum(SUPPORTED_LEVELS);
export const exerciseTypeSchema = z.enum(EXERCISE_TYPES);
export const fixedExerciseTypeSchema = z.enum(FIXED_EXERCISE_TYPES);
export const skillCategorySchema = z.enum(SKILL_CATEGORIES);
export const writingTypeSchema = z.enum(WRITING_TYPES);
export const databaseUuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
export const contentStatusSchema = z.enum([
  "draft",
  "pending_review",
  "approved",
  "published",
  "rejected",
  "archived",
]);

export const managedContentEntityTypeSchema = z.enum(["course", "exercise"]);

export const adminCourseDraftSchema = z.object({
  level: cefrLevelSchema,
  titleZhTw: z.string().trim().min(1).max(120),
  titleDe: z.string().trim().min(1).max(120),
  descriptionZhTw: z.string().trim().min(1).max(1000),
});
export type AdminCourseDraft = z.infer<typeof adminCourseDraftSchema>;

export const adminExerciseOptionDraftSchema = z.object({
  id: databaseUuidSchema,
  label: z.string().trim().min(1).max(12),
  textDe: z.string().trim().min(1).max(300),
  textZhTw: z.string().trim().max(300).optional(),
  orderIndex: z.number().int().nonnegative(),
  isCorrect: z.boolean(),
  metadataJson: z.record(z.string(), z.unknown()).default({}),
});

export const adminExerciseDraftSchema = z.object({
  activityId: databaseUuidSchema,
  level: cefrLevelSchema,
  type: exerciseTypeSchema,
  title: z.string().trim().min(1).max(120),
  instructionZhTw: z.string().trim().min(1).max(300),
  promptDe: z.string().trim().min(1).max(1000),
  payloadJson: z.record(z.string(), z.unknown()),
  skillIds: z.array(z.string().trim().min(1)).min(1).max(12),
  grammarTopicIds: z.array(z.string().trim().min(1)).max(12),
  vocabularyIds: z.array(z.string().trim().min(1)).max(20),
  estimatedSeconds: z.number().int().min(1).max(3600),
  difficulty: z.number().int().min(1).max(5),
  sourceType: z.enum(["human", "ai_assisted"]),
  orderIndex: z.number().int().nonnegative(),
  options: z.array(adminExerciseOptionDraftSchema).max(12),
  answerJson: z.record(z.string(), z.unknown()),
  gradingPolicyJson: z.record(z.string(), z.unknown()),
  explanationZhTw: z.string().trim().max(1000),
});
export type AdminExerciseDraft = z.infer<typeof adminExerciseDraftSchema>;

export const generateExerciseDraftRequestSchema = z.object({
  activityId: databaseUuidSchema,
  level: cefrLevelSchema,
  type: z.enum(AI_GENERATED_EXERCISE_TYPES),
  topicZhTw: z.string().trim().min(2).max(160),
  targetSkillIds: z.array(z.string().trim().min(1)).min(1).max(8),
  instructionsZhTw: z.string().trim().max(1000),
  orderIndex: z.number().int().nonnegative(),
  idempotencyKey: z.string().trim().min(12).max(200),
});
export type GenerateExerciseDraftRequest = z.infer<typeof generateExerciseDraftRequestSchema>;

export const generateExerciseDraftResponseSchema = z.object({
  jobId: databaseUuidSchema,
  exerciseId: databaseUuidSchema,
  contentVersionId: databaseUuidSchema,
  status: z.literal("draft"),
  reviewStatus: z.literal("draft"),
  sourceType: z.literal("ai_generated"),
  draft: generatedExerciseDraftSchema,
  idempotentReplay: z.boolean(),
});
export type GenerateExerciseDraftResponse = z.infer<typeof generateExerciseDraftResponseSchema>;

const cefrLevelRank = {
  B1: 1,
  B2: 2,
  C1: 3,
  C2: 4,
} as const;

export const apiErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  "NETWORK_ERROR",
  "DATABASE_ERROR",
  "AI_TIMEOUT",
  "AI_RESPONSE_INVALID",
  "AI_NOT_CONFIGURED",
  "AUDIO_UPLOAD_FAILED",
  "CONTENT_NOT_PUBLISHED",
]);

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string().min(1),
    retryable: z.boolean(),
    requestId: z.string().min(1),
  }),
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export const emailSchema = z.string().trim().email();
export const passwordSchema = z.string().min(8).max(128);

export const signInRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type SignInRequest = z.infer<typeof signInRequestSchema>;

export const signUpRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(80),
});
export type SignUpRequest = z.infer<typeof signUpRequestSchema>;

export const forgotPasswordRequestSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

export const learningGoalSchema = z.enum([
  "exam_preparation",
  "work",
  "study",
  "immigration",
  "daily_life",
]);

export const onboardingRequestSchema = z
  .object({
    currentLevel: cefrLevelSchema,
    targetLevel: cefrLevelSchema,
    dailyMinutes: z.number().int().min(5).max(240),
    learningGoals: z.array(learningGoalSchema).min(1).max(5),
    notificationsEnabled: z.boolean(),
  })
  .refine((value) => cefrLevelRank[value.targetLevel] >= cefrLevelRank[value.currentLevel], {
    message: "目標程度不可低於目前程度。",
    path: ["targetLevel"],
  });
export type OnboardingRequest = z.infer<typeof onboardingRequestSchema>;

export const notificationTimeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "提醒時間必須使用 HH:mm 格式。");

export const timeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, "時區格式不正確。");

export const notificationPreferencesSchema = z.object({
  notificationsEnabled: z.boolean(),
  dailyReminderEnabled: z.boolean(),
  dailyReminderTime: notificationTimeSchema,
  reviewReminderEnabled: z.boolean(),
  inactivityReminderEnabled: z.boolean(),
  inactivityDays: z.number().int().min(2).max(14),
  writingCompleteEnabled: z.boolean(),
  newCourseEnabled: z.boolean(),
  goalCompleteEnabled: z.boolean(),
  timezone: timeZoneSchema,
  updatedAt: z.string().datetime({ offset: true }),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const updateNotificationPreferencesRequestSchema = notificationPreferencesSchema.omit({
  updatedAt: true,
});
export type UpdateNotificationPreferencesRequest = z.infer<
  typeof updateNotificationPreferencesRequestSchema
>;

export const userProfileSchema = z.object({
  id: databaseUuidSchema,
  authUserId: databaseUuidSchema,
  displayName: z.string().max(80),
  role: z.enum(["learner", "content_editor", "reviewer", "admin"]),
  timezone: timeZoneSchema,
  onboardingCompleted: z.boolean(),
});

export const userSettingsResponseSchema = z.object({
  profile: userProfileSchema,
  learning: z.object({
    currentLevel: cefrLevelSchema,
    targetLevel: cefrLevelSchema,
    dailyMinutes: z.number().int().min(5).max(240),
    learningGoals: z.array(learningGoalSchema).max(5),
  }),
  notifications: notificationPreferencesSchema,
});
export type UserSettingsResponse = z.infer<typeof userSettingsResponseSchema>;

export const notificationPreferencesResponseSchema = z.object({
  notifications: notificationPreferencesSchema,
});
export type NotificationPreferencesResponse = z.infer<typeof notificationPreferencesResponseSchema>;

export const gradingPolicySchema = z.object({
  caseSensitive: z.boolean(),
  ignorePunctuation: z.boolean(),
  normalizeGermanCharacters: z.boolean(),
  allowPartialCredit: z.boolean(),
  acceptedAlternatives: z.array(z.string()),
});

export const exerciseOptionSchema = z.object({
  id: databaseUuidSchema,
  label: z.string().min(1),
  textDe: z.string().min(1),
  textZhTw: z.string().min(1).optional(),
  orderIndex: z.number().int().nonnegative(),
});

const baseExerciseSchema = z.object({
  id: databaseUuidSchema,
  level: cefrLevelSchema,
  title: z.string().min(1),
  instructionZhTw: z.string().min(1),
  promptDe: z.string().min(1),
  skillIds: z.array(z.string().min(1)),
  grammarTopicIds: z.array(z.string().min(1)),
  vocabularyIds: z.array(z.string().min(1)),
  estimatedSeconds: z.number().int().positive(),
  difficulty: z.number().int().min(1).max(5),
  sourceType: z.enum(["human", "ai_generated", "ai_assisted"]),
  reviewStatus: z.enum(["draft", "pending_review", "approved", "rejected"]),
  version: z.number().int().positive(),
});

export const multipleChoiceExerciseSchema = baseExerciseSchema.extend({
  type: z.literal("multiple_choice"),
  options: z.array(exerciseOptionSchema).min(2),
  answer: z.object({ optionId: databaseUuidSchema }),
});

export const multipleSelectExerciseSchema = baseExerciseSchema.extend({
  type: z.literal("multiple_select"),
  options: z.array(exerciseOptionSchema).min(2),
  answer: z.object({ optionIds: z.array(databaseUuidSchema).min(1) }),
  requireAllCorrect: z.boolean(),
  gradingPolicy: gradingPolicySchema,
});

export const fillBlankExerciseSchema = baseExerciseSchema.extend({
  type: z.literal("fill_blank"),
  answer: z.object({ acceptedAnswers: z.array(z.string().min(1)).min(1) }),
  gradingPolicy: gradingPolicySchema,
});

export const sentenceOrderExerciseSchema = baseExerciseSchema.extend({
  type: z.literal("sentence_order"),
  segments: z.array(z.object({ id: z.string().min(1), textDe: z.string().min(1) })).min(2),
  answer: z.object({ segmentIds: z.array(z.string().min(1)).min(2) }),
  allowPartialCredit: z.boolean(),
});

const matchingItemSchema = z.object({
  id: z.string().min(1),
  textDe: z.string().min(1),
  textZhTw: z.string().min(1).optional(),
});

export const matchingExerciseSchema = baseExerciseSchema.extend({
  type: z.literal("matching"),
  leftItems: z.array(matchingItemSchema).min(2),
  rightItems: z.array(matchingItemSchema).min(2),
  answer: z.object({ pairs: z.record(z.string().min(1), z.string().min(1)) }),
  allowPartialCredit: z.boolean(),
});

export const errorCorrectionExerciseSchema = baseExerciseSchema.extend({
  type: z.literal("error_correction"),
  answer: z.object({ acceptedAnswers: z.array(z.string().min(1)).min(1) }),
  gradingPolicy: gradingPolicySchema,
  explanationZhTw: z.string().min(1),
});

export const fixedExerciseSchema = z.discriminatedUnion("type", [
  multipleChoiceExerciseSchema,
  multipleSelectExerciseSchema,
  fillBlankExerciseSchema,
  sentenceOrderExerciseSchema,
  matchingExerciseSchema,
  errorCorrectionExerciseSchema,
]);

export const aiEvaluatedExerciseSchema = baseExerciseSchema
  .extend({
    type: z.enum(AI_EVALUATED_EXERCISE_TYPES),
    promptZhTw: z.string().min(1).optional(),
    responsePlaceholderZhTw: z.string().min(1),
    minimumCharacters: z.number().int().min(1).max(2000),
    maximumCharacters: z.number().int().min(1).max(2000),
  })
  .refine((exercise) => exercise.maximumCharacters >= exercise.minimumCharacters, {
    message: "maximumCharacters must be greater than or equal to minimumCharacters",
    path: ["maximumCharacters"],
  })
  .refine((exercise) => exercise.type !== "translation" || Boolean(exercise.promptZhTw), {
    message: "translation exercises require promptZhTw",
    path: ["promptZhTw"],
  });

export const lessonExerciseSchema = z.union([fixedExerciseSchema, aiEvaluatedExerciseSchema]);

export const activityContentSchema = z.object({
  id: databaseUuidSchema,
  lessonId: databaseUuidSchema,
  titleZhTw: z.string().min(1),
  type: z.enum(["instruction", "practice", "review", "quiz", "task"]),
  orderIndex: z.number().int().nonnegative(),
  exercises: z.array(lessonExerciseSchema),
});

export const lessonContentSchema = z.object({
  id: databaseUuidSchema,
  unitId: databaseUuidSchema,
  level: cefrLevelSchema,
  titleZhTw: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
  skillCategories: z.array(skillCategorySchema).min(1),
  prerequisiteSkillIds: z.array(z.string()),
  learningObjectives: z.array(z.string().min(1)).min(1).max(3),
  vocabularyTags: z.array(z.string()),
  grammarTags: z.array(z.string()),
  cefrDescriptor: z.string().min(1),
  status: contentStatusSchema,
  version: z.number().int().positive(),
  activities: z.array(activityContentSchema),
});

export const catalogUnitSchema = z.object({
  id: databaseUuidSchema,
  courseId: databaseUuidSchema,
  titleZhTw: z.string().min(1),
  orderIndex: z.number().int().nonnegative(),
  status: contentStatusSchema,
  version: z.number().int().positive(),
  lessons: z.array(lessonContentSchema),
});

export const catalogCourseSchema = z.object({
  id: databaseUuidSchema,
  level: cefrLevelSchema,
  titleZhTw: z.string().min(1),
  titleDe: z.string().min(1),
  descriptionZhTw: z.string().min(1),
  status: contentStatusSchema,
  version: z.number().int().positive(),
  units: z.array(catalogUnitSchema),
});

export const courseCatalogSchema = z.object({
  source: z.enum(["api", "mock", "supabase"]),
  courses: z.array(catalogCourseSchema),
});
export type CourseCatalogResponse = z.infer<typeof courseCatalogSchema>;

export const courseListRequestSchema = z
  .object({
    level: cefrLevelSchema.optional(),
  })
  .strict();
export const courseListResponseSchema = courseCatalogSchema.extend({
  source: z.literal("api"),
});
export type CourseListRequest = z.infer<typeof courseListRequestSchema>;
export type CourseListResponse = z.infer<typeof courseListResponseSchema>;

export const courseDetailRequestSchema = z
  .object({
    courseId: databaseUuidSchema,
  })
  .strict();
export const courseDetailResponseSchema = z.object({
  course: catalogCourseSchema,
});
export type CourseDetailResponse = z.infer<typeof courseDetailResponseSchema>;

export const lessonDetailRequestSchema = z
  .object({
    lessonId: databaseUuidSchema,
  })
  .strict();
export const lessonDetailResponseSchema = z.object({
  lesson: lessonContentSchema,
});
export type LessonDetailResponse = z.infer<typeof lessonDetailResponseSchema>;

export const attemptModeSchema = z.enum(["lesson", "review", "practice", "placement"]);

export const fixedGradingResultSchema = z.object({
  score: z.number().min(0).max(100),
  isCorrect: z.boolean(),
  normalizedAnswer: z.unknown(),
  acceptedAnswer: z.unknown(),
  details: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
});

export const submitAttemptRequestSchema = z
  .object({
    exerciseId: databaseUuidSchema,
    answer: z.unknown(),
    durationMs: z.number().int().min(0).max(3_600_000),
    usedHint: z.boolean(),
    mode: z.enum(["lesson", "practice", "placement"]),
    idempotencyKey: z.string().trim().min(12).max(200),
  })
  .strict();
export const submitAttemptResponseSchema = z.object({
  attemptId: databaseUuidSchema,
  lessonId: databaseUuidSchema,
  gradingResult: fixedGradingResultSchema,
  completionPercent: z.number().min(0).max(100),
  scheduledReviewCount: z.number().int().nonnegative(),
  idempotentReplay: z.boolean(),
});
export type SubmitAttemptRequest = z.infer<typeof submitAttemptRequestSchema>;
export type SubmitAttemptResponse = z.infer<typeof submitAttemptResponseSchema>;

export const errorTypeSchema = z.enum(ERROR_TYPES);
export const errorSeveritySchema = z.enum(["minor", "moderate", "major", "critical"]);
export const reviewQueueStatusSchema = z.enum(["scheduled", "completed", "skipped", "cancelled"]);
export const lessonProgressStatusSchema = z.enum(["not_started", "in_progress", "completed"]);

export const attemptSchema = z.object({
  id: databaseUuidSchema,
  userId: databaseUuidSchema,
  exerciseId: databaseUuidSchema,
  lessonId: databaseUuidSchema,
  submittedAt: z.string().datetime({ offset: true }),
  score: z.number().min(0).max(100),
  isCorrect: z.boolean(),
  durationMs: z.number().int().nonnegative(),
  usedHint: z.boolean(),
  mode: attemptModeSchema,
  idempotencyKey: z.string().min(8).max(200),
});

export const errorRecordSchema = z.object({
  id: databaseUuidSchema,
  userId: databaseUuidSchema,
  attemptId: databaseUuidSchema,
  exerciseId: databaseUuidSchema,
  lessonId: databaseUuidSchema,
  skillId: databaseUuidSchema,
  type: errorTypeSchema,
  severity: errorSeveritySchema,
  original: z.string(),
  correction: z.string(),
  explanationZhTw: z.string().min(1),
  createdAt: z.string().datetime({ offset: true }),
});

export const skillMasterySchema = z.object({
  userId: databaseUuidSchema,
  skillId: databaseUuidSchema,
  masteryScore: z.number().min(0).max(100),
  confidenceScore: z.number().min(0).max(100),
  attemptCount: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
  incorrectCount: z.number().int().nonnegative(),
  hintCount: z.number().int().nonnegative(),
  averageResponseTimeMs: z.number().nonnegative(),
  lastPracticedAt: z.string().datetime({ offset: true }).optional(),
  nextReviewAt: z.string().datetime({ offset: true }).optional(),
  correctStreak: z.number().int().nonnegative(),
  incorrectStreak: z.number().int().nonnegative(),
  lastErrorTypes: z.array(errorTypeSchema),
});

export const reviewItemSchema = z.object({
  id: databaseUuidSchema,
  userId: databaseUuidSchema,
  skillId: databaseUuidSchema,
  exerciseId: databaseUuidSchema,
  priority: z.number().int().min(0).max(100),
  scheduledAt: z.string().datetime({ offset: true }),
  reason: z.string().min(1),
  intervalDays: z.number().int().min(0).max(365),
  easeFactor: z.number().min(1.3).max(3),
  status: reviewQueueStatusSchema,
  sourceAttemptId: databaseUuidSchema.optional(),
  completedAt: z.string().datetime({ offset: true }).optional(),
});

export const lessonProgressRecordSchema = z.object({
  userId: databaseUuidSchema,
  lessonId: databaseUuidSchema,
  status: lessonProgressStatusSchema,
  completionPercent: z.number().min(0).max(100),
  completedExerciseIds: z.array(databaseUuidSchema),
  correctExerciseCount: z.number().int().nonnegative(),
  attemptedExerciseCount: z.number().int().nonnegative(),
  lastPracticedAt: z.string().datetime({ offset: true }).optional(),
  completedAt: z.string().datetime({ offset: true }).optional(),
});

export const learningRecordSnapshotSchema = z.object({
  attempts: z.array(attemptSchema),
  errors: z.array(errorRecordSchema),
  mastery: z.array(skillMasterySchema),
  reviews: z.array(reviewItemSchema),
  lessonProgress: z.array(lessonProgressRecordSchema),
  skillNames: z.record(databaseUuidSchema, z.string().min(1)),
});
export type LearningRecordSnapshotResponse = z.infer<typeof learningRecordSnapshotSchema>;

export const progressResponseSchema = learningRecordSnapshotSchema.extend({
  generatedAt: z.string().datetime({ offset: true }),
});
export type ProgressResponse = z.infer<typeof progressResponseSchema>;

export const reviewQueueRequestSchema = z
  .object({
    status: reviewQueueStatusSchema.optional(),
    dueBefore: z.string().datetime({ offset: true }).optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict();
export type ReviewQueueRequest = z.infer<typeof reviewQueueRequestSchema>;

export const reviewQueueResponseSchema = z.object({
  reviews: z.array(reviewItemSchema),
  skillNames: z.record(databaseUuidSchema, z.string().min(1)),
});
export type ReviewQueueResponse = z.infer<typeof reviewQueueResponseSchema>;

export const completeReviewRequestSchema = z
  .object({
    answer: z.unknown(),
    durationMs: z.number().int().min(0).max(3_600_000),
    usedHint: z.boolean(),
    idempotencyKey: z.string().trim().min(12).max(200),
  })
  .strict();
export const completeReviewResponseSchema = z.object({
  reviewId: databaseUuidSchema,
  status: z.literal("completed"),
  attempt: submitAttemptResponseSchema,
  nextReviewAt: z.string().datetime({ offset: true }).optional(),
});
export type CompleteReviewRequest = z.infer<typeof completeReviewRequestSchema>;
export type CompleteReviewResponse = z.infer<typeof completeReviewResponseSchema>;

export const evaluateResponseRequestSchema = z.object({
  exerciseId: databaseUuidSchema,
  responseDe: z.string().trim().min(1).max(2000),
  durationMs: z.number().int().min(0).max(3_600_000),
  usedHint: z.boolean(),
  mode: attemptModeSchema,
  idempotencyKey: z.string().min(12).max(200),
  reviewId: databaseUuidSchema.optional(),
});
export type EvaluateResponseRequest = z.infer<typeof evaluateResponseRequestSchema>;

export const evaluateResponseResponseSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(["completed", "fallback"]),
  attemptId: databaseUuidSchema.nullable(),
  feedbackId: databaseUuidSchema.nullable(),
  feedback: aiEvaluationFeedbackSchema,
  cached: z.boolean(),
  model: z.string().min(1),
  retryable: z.boolean(),
  idempotentReplay: z.boolean(),
  completionPercent: z.number().min(0).max(100).nullable(),
  fallbackReason: z
    .enum([
      "AI_NOT_CONFIGURED",
      "AI_TIMEOUT",
      "AI_RESPONSE_INVALID",
      "NETWORK_ERROR",
      "RATE_LIMITED",
    ])
    .nullable(),
  usage: z.object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    estimatedCost: z.number().nonnegative(),
    latencyMs: z.number().int().nonnegative(),
  }),
});
export type EvaluateResponseResponse = z.infer<typeof evaluateResponseResponseSchema>;

export const writingPromptSchema = z.object({
  id: databaseUuidSchema,
  lessonId: databaseUuidSchema,
  level: cefrLevelSchema,
  writingType: writingTypeSchema,
  titleZhTw: z.string().min(1),
  promptDe: z.string().min(1),
  promptZhTw: z.string().min(1),
  requirementsZhTw: z.array(z.string().min(1)).min(1).max(10),
  minimumWords: z.number().int().min(20).max(2000),
  maximumWords: z.number().int().min(20).max(2000),
  estimatedMinutes: z.number().int().min(1).max(240),
  skillIds: z.array(z.string().min(1)).min(1),
  version: z.number().int().positive(),
});
export type WritingPromptData = z.infer<typeof writingPromptSchema>;

export const writingDiffChangeSchema = z.object({
  kind: z.enum(["unchanged", "added", "removed"]),
  value: z.string().min(1),
});

export const writingVersionSchema = z.object({
  id: databaseUuidSchema,
  submissionId: databaseUuidSchema,
  previousVersionId: databaseUuidSchema.optional(),
  versionNumber: z.number().int().positive(),
  textDe: z.string().min(1).max(12000),
  wordCount: z.number().int().nonnegative(),
  diff: z.array(writingDiffChangeSchema),
  idempotencyKey: z.string().min(12).max(200),
  feedbackId: databaseUuidSchema.optional(),
  feedback: writingFeedbackSchema.optional(),
  createdAt: z.string().datetime({ offset: true }),
});
export type WritingVersionData = z.infer<typeof writingVersionSchema>;

export const writingSubmissionSchema = z.object({
  id: databaseUuidSchema,
  userId: databaseUuidSchema,
  lessonId: databaseUuidSchema,
  promptId: databaseUuidSchema,
  level: cefrLevelSchema,
  writingType: writingTypeSchema,
  status: z.enum(["evaluating", "revision_requested", "completed", "evaluation_failed"]),
  currentVersionId: databaseUuidSchema.optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  versions: z.array(writingVersionSchema),
});
export type WritingSubmissionData = z.infer<typeof writingSubmissionSchema>;

export const writingWorkspaceSchema = z.object({
  prompts: z.array(writingPromptSchema),
  submissions: z.array(writingSubmissionSchema),
});
export type WritingWorkspace = z.infer<typeof writingWorkspaceSchema>;
export const writingWorkspaceResponseSchema = writingWorkspaceSchema;
export type WritingWorkspaceResponse = z.infer<typeof writingWorkspaceResponseSchema>;

export const deleteWritingSubmissionResponseSchema = z.object({
  requestId: z.string().min(1),
  deleted: z.literal(true),
});
export type DeleteWritingSubmissionResponse = z.infer<typeof deleteWritingSubmissionResponseSchema>;

export const evaluateWritingRequestSchema = z.object({
  promptId: databaseUuidSchema,
  submissionId: databaseUuidSchema.optional(),
  textDe: z.string().trim().min(1).max(12000),
  durationMs: z.number().int().min(0).max(14_400_000),
  idempotencyKey: z.string().min(12).max(200),
});
export type EvaluateWritingRequest = z.infer<typeof evaluateWritingRequestSchema>;

export const evaluateWritingResponseSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(["completed", "fallback"]),
  submissionId: databaseUuidSchema,
  versionId: databaseUuidSchema,
  feedbackId: databaseUuidSchema.nullable(),
  versionNumber: z.number().int().positive(),
  feedback: writingFeedbackSchema.nullable(),
  model: z.string().min(1),
  retryable: z.boolean(),
  idempotentReplay: z.boolean(),
  fallbackReason: z
    .enum([
      "AI_NOT_CONFIGURED",
      "AI_TIMEOUT",
      "AI_RESPONSE_INVALID",
      "NETWORK_ERROR",
      "RATE_LIMITED",
    ])
    .nullable(),
  usage: z.object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    estimatedCost: z.number().nonnegative(),
    latencyMs: z.number().int().nonnegative(),
  }),
});
export type EvaluateWritingResponse = z.infer<typeof evaluateWritingResponseSchema>;

export const generatePracticeRequestSchema = z.object({
  level: cefrLevelSchema,
  skillIds: z.array(z.string()).min(1),
  exerciseType: exerciseTypeSchema,
  count: z.number().int().min(1).max(20),
  idempotencyKey: z.string().min(12),
});

export const textToSpeechRequestSchema = z.object({
  listeningAssetId: databaseUuidSchema,
  voice: z.enum(AUDIO_VOICES),
  idempotencyKey: z.string().min(12).max(200),
});
export type TextToSpeechRequest = z.infer<typeof textToSpeechRequestSchema>;

export const textToSpeechResponseSchema = z.object({
  requestId: z.string().min(1),
  audioAssetId: databaseUuidSchema,
  signedUrl: z.string().url(),
  expiresAt: z.string().datetime({ offset: true }),
  contentType: z.enum(["audio/wav", "audio/mpeg"]),
  voice: z.enum(AUDIO_VOICES),
  model: z.string().min(1),
  cached: z.boolean(),
});
export type TextToSpeechResponse = z.infer<typeof textToSpeechResponseSchema>;

export const listeningOptionSchema = z.object({
  key: z.string().min(1).max(20),
  textZhTw: z.string().min(1).max(300),
});

export const listeningAssetSchema = z.object({
  id: databaseUuidSchema,
  lessonId: databaseUuidSchema,
  level: cefrLevelSchema,
  kind: z.enum(LISTENING_KINDS),
  titleZhTw: z.string().min(1),
  descriptionZhTw: z.string().min(1),
  estimatedSeconds: z.number().int().positive().max(1800),
  keywordHints: z.array(z.string().min(1)).max(20),
  comprehensionQuestionZhTw: z.string().min(1),
  comprehensionOptions: z.array(listeningOptionSchema).min(2).max(8),
  skillIds: z.array(z.string().min(1)).min(1),
  ttsVoice: z.enum(AUDIO_VOICES),
  version: z.number().int().positive(),
});
export type ListeningAssetData = z.infer<typeof listeningAssetSchema>;

export const listeningAttemptSchema = z.object({
  id: databaseUuidSchema,
  userId: databaseUuidSchema,
  listeningAssetId: databaseUuidSchema,
  sessionKey: z.string().min(12).max(200),
  status: z.enum(["in_progress", "completed"]),
  playCount: z.number().int().min(0).max(1000),
  usedSlowSpeed: z.boolean(),
  transcriptViewed: z.boolean(),
  dictationText: z.string().optional(),
  dictationScore: z.number().int().min(0).max(100).optional(),
  comprehensionAnswer: z.string().optional(),
  comprehensionCorrect: z.boolean().optional(),
  difficultWords: z.array(z.string().min(1)).max(100),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type ListeningAttemptData = z.infer<typeof listeningAttemptSchema>;

export const speakingPromptSchema = z.object({
  id: databaseUuidSchema,
  lessonId: databaseUuidSchema,
  level: cefrLevelSchema,
  titleZhTw: z.string().min(1),
  instructionZhTw: z.string().min(1),
  targetDe: z.string().min(1).max(1200),
  translationZhTw: z.string().min(1),
  skillIds: z.array(z.string().min(1)).min(1),
  maximumSeconds: z.number().int().min(5).max(300),
  version: z.number().int().positive(),
});
export type SpeakingPromptData = z.infer<typeof speakingPromptSchema>;

export const speechWordTimingSchema = z.object({
  word: z.string().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
});

export const speechPauseSchema = z.object({
  afterWord: z.string().min(1),
  positionMs: z.number().int().nonnegative(),
  durationMs: z.number().int().positive(),
});

export const speechComparisonChangeSchema = z.object({
  kind: z.enum(["unchanged", "missing", "extra"]),
  value: z.string().min(1),
});

export const speakingFeedbackSchema = z.object({
  contentScore: z.number().int().min(0).max(100),
  grammarScore: z.number().int().min(0).max(100),
  fluencyScore: z.number().int().min(0).max(100),
  intelligibilityScore: z.number().int().min(0).max(100),
  wordsPerMinute: z.number().min(0).max(1000),
  paceBand: z.enum(["slow", "balanced", "fast"]),
  pauses: z.array(speechPauseSchema).max(100),
  suspectedPronunciationWords: z.array(z.string().min(1)).max(100),
  strengthsZhTw: z.array(z.string().min(1)).max(10),
  retryAdviceZhTw: z.array(z.string().min(1)).min(1).max(10),
  disclaimerZhTw: z.string().min(1),
});
export type SpeakingFeedbackData = z.infer<typeof speakingFeedbackSchema>;

export const audioAssetSchema = z.object({
  id: databaseUuidSchema,
  ownerUserId: databaseUuidSchema.optional(),
  listeningAssetId: databaseUuidSchema.optional(),
  storageBucket: z.enum(["listening-audio", "speaking-audio"]),
  storagePath: z.string().min(3).max(500),
  sourceType: z.enum(["uploaded", "generated", "licensed"]),
  license: z.string().min(3).max(200),
  contentType: z.string().startsWith("audio/"),
  durationMs: z.number().int().nonnegative().max(1_800_000),
  voice: z.enum(AUDIO_VOICES).optional(),
  model: z.string().min(1).optional(),
  createdAt: z.string().datetime({ offset: true }),
});
export type AudioAssetData = z.infer<typeof audioAssetSchema>;

export const speakingSubmissionSchema = z.object({
  id: databaseUuidSchema,
  userId: databaseUuidSchema,
  speakingPromptId: databaseUuidSchema,
  audioAssetId: databaseUuidSchema,
  status: z.enum(SPEAKING_SUBMISSION_STATUSES),
  transcriptDe: z.string().optional(),
  wordTimings: z.array(speechWordTimingSchema),
  comparison: z.array(speechComparisonChangeSchema),
  feedback: speakingFeedbackSchema.optional(),
  wordsPerMinute: z.number().min(0).max(1000).optional(),
  model: z.string().min(1).optional(),
  errorCode: z.string().min(1).optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type SpeakingSubmissionData = z.infer<typeof speakingSubmissionSchema>;

export const audioLearningWorkspaceSchema = z.object({
  listeningAssets: z.array(listeningAssetSchema),
  listeningAttempts: z.array(listeningAttemptSchema),
  speakingPrompts: z.array(speakingPromptSchema),
  speakingSubmissions: z.array(speakingSubmissionSchema),
  audioAssets: z.array(audioAssetSchema),
});
export type AudioLearningWorkspace = z.infer<typeof audioLearningWorkspaceSchema>;
export const audioLearningWorkspaceResponseSchema = audioLearningWorkspaceSchema;
export type AudioLearningWorkspaceResponse = z.infer<typeof audioLearningWorkspaceResponseSchema>;

export const listeningActivityRequestSchema = z.object({
  listeningAssetId: databaseUuidSchema,
  sessionKey: z.string().min(12).max(200),
  playIncrement: z.number().int().min(0).max(20),
  usedSlowSpeed: z.boolean(),
  transcriptViewed: z.boolean(),
});
export type ListeningActivityRequest = z.infer<typeof listeningActivityRequestSchema>;

export const listeningActivityResponseSchema = z.object({
  requestId: z.string().min(1),
  attemptId: databaseUuidSchema,
});
export type ListeningActivityResponse = z.infer<typeof listeningActivityResponseSchema>;

export const revealListeningTranscriptRequestSchema = listeningActivityRequestSchema.omit({
  transcriptViewed: true,
});
export type RevealListeningTranscriptRequest = z.infer<
  typeof revealListeningTranscriptRequestSchema
>;

export const revealListeningTranscriptResponseSchema = z.object({
  requestId: z.string().min(1),
  attemptId: databaseUuidSchema,
  transcriptDe: z.string().min(1),
});
export type RevealListeningTranscriptResponse = z.infer<
  typeof revealListeningTranscriptResponseSchema
>;

export const submitDictationRequestSchema = z.object({
  listeningAssetId: databaseUuidSchema,
  sessionKey: z.string().min(12).max(200),
  textDe: z.string().trim().min(1).max(4096),
  comprehensionAnswer: z.string().min(1).max(20),
  playCount: z.number().int().min(0).max(1000),
  usedSlowSpeed: z.boolean(),
  idempotencyKey: z.string().min(12).max(200),
});
export type SubmitDictationRequest = z.infer<typeof submitDictationRequestSchema>;

export const submitDictationResponseSchema = z.object({
  requestId: z.string().min(1),
  attemptId: databaseUuidSchema,
  transcriptDe: z.string().min(1),
  score: z.number().int().min(0).max(100),
  comparison: z.array(speechComparisonChangeSchema),
  difficultWords: z.array(z.string().min(1)),
  comprehensionCorrect: z.boolean(),
  idempotentReplay: z.boolean(),
});
export type SubmitDictationResponse = z.infer<typeof submitDictationResponseSchema>;

export const transcribeRequestSchema = z.object({
  speakingPromptId: databaseUuidSchema,
  storagePath: z
    .string()
    .min(39)
    .max(500)
    .regex(/^[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/i),
  mimeType: z.enum([
    "audio/m4a",
    "audio/mp4",
    "audio/mpeg",
    "audio/webm",
    "audio/wav",
    "audio/x-m4a",
  ]),
  durationMs: z.number().int().min(500).max(120_000),
  idempotencyKey: z.string().min(12).max(200),
});
export type TranscribeRequest = z.infer<typeof transcribeRequestSchema>;

export const transcribeResponseSchema = z.object({
  requestId: z.string().min(1),
  submissionId: databaseUuidSchema,
  audioAssetId: databaseUuidSchema,
  status: z.enum(["completed", "fallback"]),
  transcriptDe: z.string().nullable(),
  wordTimings: z.array(speechWordTimingSchema),
  comparison: z.array(speechComparisonChangeSchema),
  feedback: speakingFeedbackSchema.nullable(),
  model: z.string().min(1),
  idempotentReplay: z.boolean(),
  retryable: z.boolean(),
  fallbackReason: z
    .enum(["AI_NOT_CONFIGURED", "AI_TIMEOUT", "NETWORK_ERROR", "RATE_LIMITED"])
    .nullable(),
});
export type TranscribeResponse = z.infer<typeof transcribeResponseSchema>;

export const deleteSpeakingSubmissionResponseSchema = z.object({
  requestId: z.string().min(1),
  deleted: z.literal(true),
});
export type DeleteSpeakingSubmissionResponse = z.infer<
  typeof deleteSpeakingSubmissionResponseSchema
>;

export const createConversationRequestSchema = z.object({
  scenarioId: z.string().uuid(),
  idempotencyKey: z.string().min(12),
});

export const sendConversationMessageRequestSchema = z.object({
  conversationId: z.string().uuid(),
  messageDe: z.string().min(1).max(2000),
  idempotencyKey: z.string().min(12),
});
