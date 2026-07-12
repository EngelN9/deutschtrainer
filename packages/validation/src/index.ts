import { z } from "zod";
import {
  EXERCISE_TYPES,
  FIXED_EXERCISE_TYPES,
  SKILL_CATEGORIES,
  SUPPORTED_LEVELS,
} from "@deutschtrainer/shared-types";

export const cefrLevelSchema = z.enum(SUPPORTED_LEVELS);
export const exerciseTypeSchema = z.enum(EXERCISE_TYPES);
export const fixedExerciseTypeSchema = z.enum(FIXED_EXERCISE_TYPES);
export const skillCategorySchema = z.enum(SKILL_CATEGORIES);
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
                  exercises: z.array(fixedExerciseSchema),
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
  exerciseId: z.string().uuid(),
  level: cefrLevelSchema,
  promptDe: z.string().min(1),
  responseDe: z.string().min(1),
  idempotencyKey: z.string().min(12),
});

export const evaluateWritingRequestSchema = z.object({
  submissionId: z.string().uuid(),
  level: cefrLevelSchema,
  writingType: z.string().min(1),
  textDe: z.string().min(1).max(6000),
  pass: z.enum(["first_pass", "second_pass"]),
  idempotencyKey: z.string().min(12),
});

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
