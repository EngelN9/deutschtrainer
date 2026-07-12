import { describe, expect, it } from "@jest/globals";
import { aiEvaluationFeedbackSchema } from "./index";

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
});
