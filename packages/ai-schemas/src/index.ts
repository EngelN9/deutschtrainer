import { z } from "zod";
import { ERROR_TYPES, SUPPORTED_LEVELS } from "@deutschtrainer/shared-types";

export const aiSchemaVersions = {
  evaluationFeedback: "AiEvaluationFeedback.v1",
  writingFeedback: "WritingFeedback.v1",
  speakingFeedback: "SpeakingFeedback.v1",
} as const;

export const aiErrorItemSchema = z.object({
  type: z.enum(ERROR_TYPES),
  severity: z.enum(["minor", "moderate", "major", "critical"]),
  original: z.string(),
  correction: z.string(),
  explanationZhTw: z.string().min(1),
  relatedSkillId: z.string().min(1),
  grammarTopicId: z.string().optional(),
  vocabularyId: z.string().optional(),
});
export type AiErrorItem = z.infer<typeof aiErrorItemSchema>;

export const aiEvaluationFeedbackSchema = z.object({
  isCorrect: z.boolean(),
  score: z.number().int().min(0).max(100),
  cefrLevelEstimate: z.enum(SUPPORTED_LEVELS),
  correctedText: z.string(),
  errors: z.array(aiErrorItemSchema),
  strengths: z.array(z.string()),
  suggestions: z.array(z.string()),
  naturalAlternative: z.string(),
  requiresHumanReview: z.boolean(),
});
export type AiEvaluationFeedback = z.infer<typeof aiEvaluationFeedbackSchema>;

export const writingFeedbackSchema = z.object({
  score: z.number().int().min(0).max(100),
  cefrLevelEstimate: z.enum(SUPPORTED_LEVELS),
  rubricScores: z.object({
    taskCompletion: z.number().min(0).max(100),
    grammar: z.number().min(0).max(100),
    vocabulary: z.number().min(0).max(100),
    coherence: z.number().min(0).max(100),
    cohesion: z.number().min(0).max(100),
    register: z.number().min(0).max(100),
    argumentation: z.number().min(0).max(100),
    style: z.number().min(0).max(100),
    accuracy: z.number().min(0).max(100),
    idiomaticity: z.number().min(0).max(100),
  }),
  inlineErrors: z.array(
    aiErrorItemSchema.extend({
      startOffset: z.number().int().nonnegative(),
      endOffset: z.number().int().nonnegative(),
    }),
  ),
  strengths: z.array(z.string()),
  revisionTasks: z.array(z.string()),
  referenceVersion: z.string().optional(),
  repeatedErrorTypes: z.array(z.enum(ERROR_TYPES)),
  requiresHumanReview: z.boolean(),
});
export type WritingFeedback = z.infer<typeof writingFeedbackSchema>;
