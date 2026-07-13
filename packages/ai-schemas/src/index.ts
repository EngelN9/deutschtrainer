import { z } from "zod";
import { ERROR_TYPES, SUPPORTED_LEVELS } from "@deutschtrainer/shared-types";

export const aiSchemaVersions = {
  evaluationFeedback: "AiEvaluationFeedback.v1",
  writingFeedback: "WritingFeedback.v1",
  speakingFeedback: "SpeakingFeedback.v1",
} as const;

export const aiErrorItemSchema = z
  .object({
    type: z.enum(ERROR_TYPES),
    severity: z.enum(["minor", "moderate", "major", "critical"]),
    original: z.string().min(1),
    correction: z.string().min(1),
    explanationZhTw: z.string().min(1),
    relatedSkillId: z.string().min(1),
    grammarTopicId: z.string().min(1).nullable(),
    vocabularyId: z.string().min(1).nullable(),
  })
  .strict();
export type AiErrorItem = z.infer<typeof aiErrorItemSchema>;

export const aiEvaluationFeedbackSchema = z
  .object({
    isCorrect: z.boolean(),
    score: z.number().int().min(0).max(100),
    cefrLevelEstimate: z.enum(SUPPORTED_LEVELS),
    correctedText: z.string().min(1),
    errors: z.array(aiErrorItemSchema).max(20),
    strengths: z.array(z.string().min(1)).max(8),
    suggestions: z.array(z.string().min(1)).max(8),
    naturalAlternative: z.string().min(1),
    requiresHumanReview: z.boolean(),
  })
  .strict();
export type AiEvaluationFeedback = z.infer<typeof aiEvaluationFeedbackSchema>;

export const aiEvaluationFeedbackJsonSchema = {
  type: "object",
  properties: {
    isCorrect: { type: "boolean" },
    score: { type: "integer", minimum: 0, maximum: 100 },
    cefrLevelEstimate: { type: "string", enum: [...SUPPORTED_LEVELS] },
    correctedText: { type: "string", minLength: 1 },
    errors: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: [...ERROR_TYPES] },
          severity: {
            type: "string",
            enum: ["minor", "moderate", "major", "critical"],
          },
          original: { type: "string", minLength: 1 },
          correction: { type: "string", minLength: 1 },
          explanationZhTw: { type: "string", minLength: 1 },
          relatedSkillId: { type: "string", minLength: 1 },
          grammarTopicId: { type: ["string", "null"] },
          vocabularyId: { type: ["string", "null"] },
        },
        required: [
          "type",
          "severity",
          "original",
          "correction",
          "explanationZhTw",
          "relatedSkillId",
          "grammarTopicId",
          "vocabularyId",
        ],
        additionalProperties: false,
      },
    },
    strengths: {
      type: "array",
      maxItems: 8,
      items: { type: "string", minLength: 1 },
    },
    suggestions: {
      type: "array",
      maxItems: 8,
      items: { type: "string", minLength: 1 },
    },
    naturalAlternative: { type: "string", minLength: 1 },
    requiresHumanReview: { type: "boolean" },
  },
  required: [
    "isCorrect",
    "score",
    "cefrLevelEstimate",
    "correctedText",
    "errors",
    "strengths",
    "suggestions",
    "naturalAlternative",
    "requiresHumanReview",
  ],
  additionalProperties: false,
} as const;

export function createAiEvaluationFeedbackJsonSchema(
  allowedSkillIds: readonly string[],
): Record<string, unknown> {
  const schema = structuredClone(aiEvaluationFeedbackJsonSchema) as Record<string, unknown>;
  const properties = schema.properties as Record<string, Record<string, unknown>>;
  const errors = properties.errors;
  if (!errors) {
    throw new Error("AI evaluation JSON Schema is missing errors.");
  }
  const errorItem = errors.items as Record<string, unknown>;
  const errorProperties = errorItem.properties as Record<string, Record<string, unknown>>;
  errorProperties.relatedSkillId = {
    type: "string",
    enum: [...allowedSkillIds],
  };
  return schema;
}

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
