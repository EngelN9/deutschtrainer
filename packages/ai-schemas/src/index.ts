import { z } from "zod";
import { ERROR_TYPES, SUPPORTED_LEVELS } from "@deutschtrainer/shared-types";

export const aiSchemaVersions = {
  evaluationFeedback: "AiEvaluationFeedback.v1",
  writingFeedback: "WritingFeedback.v1",
  speakingFeedback: "SpeakingFeedback.v1",
  generatedExerciseDraft: "GeneratedExerciseDraft.v1",
} as const;

export const generatedExerciseOptionSchema = z
  .object({
    label: z.string().trim().min(1).max(12),
    textDe: z.string().trim().min(1).max(300),
    textZhTw: z.string().trim().min(1).max(300).nullable(),
    isCorrect: z.boolean(),
  })
  .strict();

export const generatedExerciseDraftSchema = z
  .object({
    type: z.enum(["multiple_choice", "fill_blank", "error_correction"]),
    titleZhTw: z.string().trim().min(1).max(120),
    instructionZhTw: z.string().trim().min(1).max(300),
    promptDe: z.string().trim().min(1).max(800),
    estimatedSeconds: z.number().int().min(15).max(600),
    difficulty: z.number().int().min(1).max(5),
    options: z.array(generatedExerciseOptionSchema).max(8),
    acceptedAnswers: z.array(z.string().trim().min(1).max(500)).max(12),
    explanationZhTw: z.string().trim().min(1).max(1000).nullable(),
    validationNotes: z.array(z.string().trim().min(1).max(300)).max(8),
    requiresHumanReview: z.literal(true),
  })
  .strict()
  .superRefine((draft, context) => {
    if (draft.type === "multiple_choice") {
      if (draft.options.length < 2) {
        context.addIssue({
          code: "custom",
          message: "multiple_choice requires at least two options",
          path: ["options"],
        });
      }
      if (draft.options.filter((option) => option.isCorrect).length !== 1) {
        context.addIssue({
          code: "custom",
          message: "multiple_choice requires exactly one correct option",
          path: ["options"],
        });
      }
      if (draft.acceptedAnswers.length > 0) {
        context.addIssue({
          code: "custom",
          message: "multiple_choice must not include acceptedAnswers",
          path: ["acceptedAnswers"],
        });
      }
    } else {
      if (draft.options.length > 0) {
        context.addIssue({
          code: "custom",
          message: `${draft.type} must not include options`,
          path: ["options"],
        });
      }
      if (draft.acceptedAnswers.length === 0) {
        context.addIssue({
          code: "custom",
          message: `${draft.type} requires acceptedAnswers`,
          path: ["acceptedAnswers"],
        });
      }
    }

    if (draft.type === "error_correction" && !draft.explanationZhTw) {
      context.addIssue({
        code: "custom",
        message: "error_correction requires a Traditional Chinese explanation",
        path: ["explanationZhTw"],
      });
    }
  });
export type GeneratedExerciseDraft = z.infer<typeof generatedExerciseDraftSchema>;

export const generatedExerciseDraftJsonSchema = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["multiple_choice", "fill_blank", "error_correction"],
    },
    titleZhTw: { type: "string", minLength: 1, maxLength: 120 },
    instructionZhTw: { type: "string", minLength: 1, maxLength: 300 },
    promptDe: { type: "string", minLength: 1, maxLength: 800 },
    estimatedSeconds: { type: "integer", minimum: 15, maximum: 600 },
    difficulty: { type: "integer", minimum: 1, maximum: 5 },
    options: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          label: { type: "string", minLength: 1, maxLength: 12 },
          textDe: { type: "string", minLength: 1, maxLength: 300 },
          textZhTw: { type: ["string", "null"] },
          isCorrect: { type: "boolean" },
        },
        required: ["label", "textDe", "textZhTw", "isCorrect"],
        additionalProperties: false,
      },
    },
    acceptedAnswers: {
      type: "array",
      maxItems: 12,
      items: { type: "string", minLength: 1, maxLength: 500 },
    },
    explanationZhTw: { type: ["string", "null"] },
    validationNotes: {
      type: "array",
      maxItems: 8,
      items: { type: "string", minLength: 1, maxLength: 300 },
    },
    requiresHumanReview: { type: "boolean", const: true },
  },
  required: [
    "type",
    "titleZhTw",
    "instructionZhTw",
    "promptDe",
    "estimatedSeconds",
    "difficulty",
    "options",
    "acceptedAnswers",
    "explanationZhTw",
    "validationNotes",
    "requiresHumanReview",
  ],
  additionalProperties: false,
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

export const writingFeedbackSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    cefrLevelEstimate: z.enum(SUPPORTED_LEVELS),
    rubricScores: z
      .object({
        taskCompletion: z.number().int().min(0).max(100),
        grammar: z.number().int().min(0).max(100),
        vocabulary: z.number().int().min(0).max(100),
        coherence: z.number().int().min(0).max(100),
        cohesion: z.number().int().min(0).max(100),
        register: z.number().int().min(0).max(100),
        argumentation: z.number().int().min(0).max(100),
        style: z.number().int().min(0).max(100),
        accuracy: z.number().int().min(0).max(100),
        idiomaticity: z.number().int().min(0).max(100),
      })
      .strict(),
    inlineErrors: z
      .array(
        aiErrorItemSchema
          .extend({
            startOffset: z.number().int().nonnegative(),
            endOffset: z.number().int().positive(),
          })
          .strict(),
      )
      .max(50),
    strengths: z.array(z.string().min(1)).max(10),
    revisionTasks: z.array(z.string().min(1)).min(1).max(10),
    referenceVersion: z.string().min(1).nullable(),
    repeatedErrorTypes: z.array(z.enum(ERROR_TYPES)).max(20),
    requiresHumanReview: z.boolean(),
  })
  .strict();
export type WritingFeedback = z.infer<typeof writingFeedbackSchema>;

export const writingFeedbackJsonSchema = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    cefrLevelEstimate: { type: "string", enum: [...SUPPORTED_LEVELS] },
    rubricScores: {
      type: "object",
      properties: {
        taskCompletion: { type: "integer", minimum: 0, maximum: 100 },
        grammar: { type: "integer", minimum: 0, maximum: 100 },
        vocabulary: { type: "integer", minimum: 0, maximum: 100 },
        coherence: { type: "integer", minimum: 0, maximum: 100 },
        cohesion: { type: "integer", minimum: 0, maximum: 100 },
        register: { type: "integer", minimum: 0, maximum: 100 },
        argumentation: { type: "integer", minimum: 0, maximum: 100 },
        style: { type: "integer", minimum: 0, maximum: 100 },
        accuracy: { type: "integer", minimum: 0, maximum: 100 },
        idiomaticity: { type: "integer", minimum: 0, maximum: 100 },
      },
      required: [
        "taskCompletion",
        "grammar",
        "vocabulary",
        "coherence",
        "cohesion",
        "register",
        "argumentation",
        "style",
        "accuracy",
        "idiomaticity",
      ],
      additionalProperties: false,
    },
    inlineErrors: {
      type: "array",
      maxItems: 50,
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
          startOffset: { type: "integer", minimum: 0 },
          endOffset: { type: "integer", minimum: 1 },
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
          "startOffset",
          "endOffset",
        ],
        additionalProperties: false,
      },
    },
    strengths: {
      type: "array",
      maxItems: 10,
      items: { type: "string", minLength: 1 },
    },
    revisionTasks: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: { type: "string", minLength: 1 },
    },
    referenceVersion: { type: ["string", "null"] },
    repeatedErrorTypes: {
      type: "array",
      maxItems: 20,
      items: { type: "string", enum: [...ERROR_TYPES] },
    },
    requiresHumanReview: { type: "boolean" },
  },
  required: [
    "score",
    "cefrLevelEstimate",
    "rubricScores",
    "inlineErrors",
    "strengths",
    "revisionTasks",
    "referenceVersion",
    "repeatedErrorTypes",
    "requiresHumanReview",
  ],
  additionalProperties: false,
} as const;

export function createWritingFeedbackJsonSchema(
  allowedSkillIds: readonly string[],
): Record<string, unknown> {
  const schema = structuredClone(writingFeedbackJsonSchema) as Record<string, unknown>;
  const properties = schema.properties as Record<string, Record<string, unknown>>;
  const inlineErrors = properties.inlineErrors;
  if (!inlineErrors) {
    throw new Error("Writing feedback JSON Schema is missing inlineErrors.");
  }
  const errorItem = inlineErrors.items as Record<string, unknown>;
  const errorProperties = errorItem.properties as Record<string, Record<string, unknown>>;
  errorProperties.relatedSkillId = { type: "string", enum: [...allowedSkillIds] };
  return schema;
}
