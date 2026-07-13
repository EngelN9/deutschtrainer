import { z } from "zod";
import { aiEvaluationFeedbackSchema, writingFeedbackSchema } from "@deutschtrainer/ai-schemas";
import {
  AI_EVALUATED_EXERCISE_TYPES,
  ERROR_TYPES,
  EXERCISE_TYPES,
  FIXED_EXERCISE_TYPES,
  SKILL_CATEGORIES,
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

export const courseCatalogSchema = z.object({
  source: z.enum(["mock", "supabase"]),
  courses: z.array(
    z.object({
      id: databaseUuidSchema,
      level: cefrLevelSchema,
      titleZhTw: z.string().min(1),
      titleDe: z.string().min(1),
      descriptionZhTw: z.string().min(1),
      status: contentStatusSchema,
      version: z.number().int().positive(),
      units: z.array(
        z.object({
          id: databaseUuidSchema,
          courseId: databaseUuidSchema,
          titleZhTw: z.string().min(1),
          orderIndex: z.number().int().nonnegative(),
          status: contentStatusSchema,
          version: z.number().int().positive(),
          lessons: z.array(
            z.object({
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
              activities: z.array(
                z.object({
                  id: databaseUuidSchema,
                  lessonId: databaseUuidSchema,
                  titleZhTw: z.string().min(1),
                  type: z.enum(["instruction", "practice", "review", "quiz", "task"]),
                  orderIndex: z.number().int().nonnegative(),
                  exercises: z.array(lessonExerciseSchema),
                }),
              ),
            }),
          ),
        }),
      ),
    }),
  ),
});
export type CourseCatalogResponse = z.infer<typeof courseCatalogSchema>;

export const courseSummarySchema = z.object({
  id: z.string().uuid(),
  level: cefrLevelSchema,
  titleZhTw: z.string().min(1),
  titleDe: z.string().min(1),
  descriptionZhTw: z.string().min(1),
  completionPercent: z.number().min(0).max(100).optional(),
});

export const courseListRequestSchema = z.object({
  level: cefrLevelSchema.optional(),
});
export const courseListResponseSchema = z.object({
  courses: z.array(courseSummarySchema),
});
export type CourseListRequest = z.infer<typeof courseListRequestSchema>;
export type CourseListResponse = z.infer<typeof courseListResponseSchema>;

export const courseDetailRequestSchema = z.object({
  courseId: z.string().uuid(),
});
export const courseDetailResponseSchema = z.object({
  course: courseSummarySchema,
  units: z.array(
    z.object({
      id: z.string().uuid(),
      titleZhTw: z.string().min(1),
      orderIndex: z.number().int().nonnegative(),
      lessonCount: z.number().int().nonnegative(),
    }),
  ),
});

export const lessonDetailRequestSchema = z.object({
  lessonId: z.string().uuid(),
});
export const lessonDetailResponseSchema = z.object({
  lesson: z.object({
    id: z.string().uuid(),
    level: cefrLevelSchema,
    titleZhTw: z.string().min(1),
    learningObjectives: z.array(z.string().min(1)).min(1).max(3),
    estimatedMinutes: z.number().int().positive(),
    activityIds: z.array(z.string().uuid()),
  }),
});

export const submitAttemptRequestSchema = z.object({
  exerciseId: z.string().uuid(),
  lessonId: z.string().uuid(),
  answer: z.unknown(),
  durationMs: z.number().int().nonnegative(),
  usedHint: z.boolean(),
  idempotencyKey: z.string().min(12),
});
export const submitAttemptResponseSchema = z.object({
  attemptId: z.string().uuid(),
  score: z.number().min(0).max(100),
  isCorrect: z.boolean(),
  createdReviewItemIds: z.array(z.string().uuid()),
});

export const progressResponseSchema = z.object({
  currentLevel: cefrLevelSchema,
  targetLevel: cefrLevelSchema,
  weeklyLearningMinutes: z.number().int().nonnegative(),
  weakSkillIds: z.array(z.string()),
});

export const reviewQueueResponseSchema = z.object({
  reviews: z.array(
    z.object({
      id: z.string().uuid(),
      skillId: z.string(),
      exerciseId: z.string().uuid(),
      scheduledAt: z.string().datetime(),
      priority: z.number().int().min(0),
    }),
  ),
});

export const attemptModeSchema = z.enum(["lesson", "review", "practice", "placement"]);
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

export const completeReviewRequestSchema = z.object({
  reviewId: z.string().uuid(),
  idempotencyKey: z.string().min(12),
});
export const completeReviewResponseSchema = z.object({
  reviewId: z.string().uuid(),
  status: z.literal("completed"),
  nextReviewAt: z.string().datetime().optional(),
});

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
  textDe: z.string().min(1).max(3000),
  voice: z.string().min(1),
  idempotencyKey: z.string().min(12),
});

export const transcribeRequestSchema = z.object({
  audioAssetId: z.string().uuid(),
  idempotencyKey: z.string().min(12),
});

export const createConversationRequestSchema = z.object({
  scenarioId: z.string().uuid(),
  idempotencyKey: z.string().min(12),
});

export const sendConversationMessageRequestSchema = z.object({
  conversationId: z.string().uuid(),
  messageDe: z.string().min(1).max(2000),
  idempotencyKey: z.string().min(12),
});
