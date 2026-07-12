export interface PromptDefinition {
  id: string;
  version: string;
  purpose: string;
  outputSchemaId: string;
}

export const promptRegistry = {
  evaluateResponseV1: {
    id: "evaluate-response",
    version: "1.0.0",
    purpose: "Evaluate a learner's German free response with Traditional Chinese feedback.",
    outputSchemaId: "AiEvaluationFeedback.v1",
  },
  evaluateWritingV1: {
    id: "evaluate-writing",
    version: "1.0.0",
    purpose: "Evaluate a German writing submission with rubric scores and revision tasks.",
    outputSchemaId: "WritingFeedback.v1",
  },
} satisfies Record<string, PromptDefinition>;
