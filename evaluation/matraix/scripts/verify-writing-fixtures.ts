import { readFile } from "node:fs/promises";
import path from "node:path";
import { writingFeedbackSchema } from "../../../packages/ai-schemas/src/index.ts";
import { promptRegistry } from "../../../packages/ai-prompts/src/index.ts";

interface ContractArtifact {
  learner_text_de: string;
  prompt_version: string;
  feedback_schema_id: string;
  writingFeedbackContract: unknown;
}

async function main(): Promise<void> {
  const artifactPath = path.resolve(
    __dirname,
    "../data/expanded/writing-feedback-contracts.v1.json",
  );
  const raw = JSON.parse(await readFile(artifactPath, "utf8")) as unknown;

  if (!Array.isArray(raw) || raw.length !== 36) {
    throw new Error("Expected exactly 36 expanded writing-feedback contracts.");
  }

  for (const item of raw as ContractArtifact[]) {
    if (item.prompt_version !== promptRegistry.evaluateWritingV1.version) {
      throw new Error("Evaluation prompt version drifted from the production prompt registry.");
    }
    if (item.feedback_schema_id !== promptRegistry.evaluateWritingV1.outputSchemaId) {
      throw new Error("Evaluation feedback schema id drifted from the prompt registry.");
    }
    const feedback = writingFeedbackSchema.parse(item.writingFeedbackContract);
    for (const error of feedback.inlineErrors) {
      if (item.learner_text_de.slice(error.startOffset, error.endOffset) !== error.original) {
        throw new Error("A checked UTF-16 inline offset no longer matches its frozen text.");
      }
    }
  }

  process.stdout.write(
    `${JSON.stringify({ status: "PASS", contracts: raw.length, schema: "WritingFeedback.v1" })}\n`,
  );
}

void main();
