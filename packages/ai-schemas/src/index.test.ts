import { describe, expect, it } from "@jest/globals";
import {
  aiEvaluationFeedbackSchema,
  generatedExerciseDraftSchema,
  createAiEvaluationFeedbackJsonSchema,
  createWritingFeedbackJsonSchema,
  writingFeedbackSchema,
} from "./index";

describe("generatedExerciseDraftSchema", () => {
  it("requires one correct option and mandatory human review", () => {
    const draft = generatedExerciseDraftSchema.parse({
      type: "multiple_choice",
      titleZhTw: "正式提問",
      instructionZhTw: "請選擇正確答案。",
      promptDe: "Welche Formulierung ist höflich?",
      estimatedSeconds: 45,
      difficulty: 2,
      options: [
        { label: "A", textDe: "Könnten Sie helfen?", textZhTw: null, isCorrect: true },
        { label: "B", textDe: "Hilf sofort!", textZhTw: null, isCorrect: false },
      ],
      acceptedAnswers: [],
      explanationZhTw: null,
      validationNotes: ["需要人工確認語域。"],
      requiresHumanReview: true,
    });

    expect(draft.requiresHumanReview).toBe(true);
    expect(draft.options.filter((option) => option.isCorrect)).toHaveLength(1);
  });

  it("rejects output that attempts to skip review", () => {
    const result = generatedExerciseDraftSchema.safeParse({
      type: "fill_blank",
      titleZhTw: "介系詞",
      instructionZhTw: "請填空。",
      promptDe: "Ich warte ___ den Bus.",
      estimatedSeconds: 30,
      difficulty: 2,
      options: [],
      acceptedAnswers: ["auf"],
      explanationZhTw: null,
      validationNotes: [],
      requiresHumanReview: false,
    });

    expect(result.success).toBe(false);
  });
});

describe("AI schemas", () => {
  it("validates structured AI evaluation feedback", () => {
    const result = aiEvaluationFeedbackSchema.parse({
      isCorrect: false,
      score: 76,
      cefrLevelEstimate: "B2",
      correctedText: "Obwohl die Maßnahme teuer ist, könnte sie langfristig Vorteile bringen.",
      errors: [
        {
          type: "word_order",
          severity: "major",
          original: "obwohl die Maßnahme ist teuer",
          correction: "obwohl die Maßnahme teuer ist",
          explanationZhTw: "obwohl 引導從句時，變位動詞應置於句尾。",
          relatedSkillId: "B1.word_order.subordinate_clause",
          grammarTopicId: null,
          vocabularyId: null,
        },
      ],
      strengths: ["論點清楚"],
      suggestions: ["練習讓步從句的動詞位置"],
      naturalAlternative:
        "Trotz der hohen Kosten könnte die Maßnahme langfristig von Vorteil sein.",
      requiresHumanReview: false,
    });

    expect(result.errors[0]?.type).toBe("word_order");
  });

  it("limits Structured Outputs to the exercise skills", () => {
    const schema = createAiEvaluationFeedbackJsonSchema(["B2.argumentation.counterargument"]);
    const properties = schema.properties as Record<string, Record<string, unknown>>;
    const errors = properties.errors;
    expect(errors).toBeDefined();
    if (!errors) {
      throw new Error("errors schema is required");
    }
    const item = errors.items as Record<string, unknown>;
    const errorProperties = item.properties as Record<string, Record<string, unknown>>;

    expect(errorProperties.relatedSkillId?.enum).toEqual(["B2.argumentation.counterargument"]);
  });

  it("validates all ten writing rubrics and UTF-16 inline offsets", () => {
    const result = writingFeedbackSchema.parse({
      score: 72,
      cefrLevelEstimate: "B1",
      rubricScores: {
        taskCompletion: 80,
        grammar: 60,
        vocabulary: 72,
        coherence: 75,
        cohesion: 70,
        register: 78,
        argumentation: 65,
        style: 70,
        accuracy: 62,
        idiomaticity: 68,
      },
      inlineErrors: [
        {
          type: "word_order",
          severity: "major",
          original: "weil ich muss arbeiten",
          correction: "weil ich arbeiten muss",
          explanationZhTw: "weil 從句的變位動詞應放在句尾。",
          relatedSkillId: "B1.writing.formal_email",
          grammarTopicId: null,
          vocabularyId: null,
          startOffset: 20,
          endOffset: 43,
        },
      ],
      strengths: ["任務目的清楚。"],
      revisionTasks: ["修正從句語序。"],
      referenceVersion: null,
      repeatedErrorTypes: [],
      requiresHumanReview: false,
    });

    expect(Object.keys(result.rubricScores)).toHaveLength(10);
    expect(result.inlineErrors[0]?.endOffset).toBe(43);
  });

  it("limits writing Structured Outputs to the prompt skills", () => {
    const schema = createWritingFeedbackJsonSchema(["B1.writing.formal_email"]);
    const properties = schema.properties as Record<string, Record<string, unknown>>;
    const errors = properties.inlineErrors;
    expect(errors).toBeDefined();
    if (!errors) {
      throw new Error("inlineErrors schema is required");
    }
    const item = errors.items as Record<string, unknown>;
    const errorProperties = item.properties as Record<string, Record<string, unknown>>;

    expect(errorProperties.relatedSkillId?.enum).toEqual(["B1.writing.formal_email"]);
  });
});
