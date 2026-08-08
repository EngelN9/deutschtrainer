import type { WritingFeedback } from "@deutschtrainer/ai-schemas";
import type { ErrorType } from "@deutschtrainer/shared-types";

type WritingIssue = WritingFeedback["inlineErrors"][number];

const severityPriority: Record<WritingIssue["severity"], number> = {
  critical: 0,
  major: 1,
  moderate: 2,
  minor: 3,
};

export interface WritingImprovementSummary {
  remainingErrorTypes: ErrorType[];
  resolvedErrorTypes: ErrorType[];
  scoreDelta: number;
}

export function getTopWritingIssues(feedback: WritingFeedback, limit = 3): WritingIssue[] {
  return feedback.inlineErrors
    .map((issue, index) => ({ index, issue }))
    .sort(
      (left, right) =>
        severityPriority[left.issue.severity] - severityPriority[right.issue.severity] ||
        left.index - right.index,
    )
    .slice(0, Math.max(0, limit))
    .map(({ issue }) => issue);
}

export function getWritingImprovementSummary(
  previous: WritingFeedback,
  current: WritingFeedback,
): WritingImprovementSummary {
  const previousTypes = uniqueErrorTypes(previous.inlineErrors.map((issue) => issue.type));
  const currentTypes = uniqueErrorTypes(current.inlineErrors.map((issue) => issue.type));
  const currentTypeSet = new Set(currentTypes);

  return {
    remainingErrorTypes: uniqueErrorTypes(getTopWritingIssues(current).map((issue) => issue.type)),
    resolvedErrorTypes: previousTypes.filter((type) => !currentTypeSet.has(type)).slice(0, 3),
    scoreDelta: current.score - previous.score,
  };
}

function uniqueErrorTypes(types: ErrorType[]): ErrorType[] {
  return [...new Set(types)];
}
