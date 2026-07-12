import type {
  ErrorCorrectionExercise,
  FillBlankExercise,
  FixedExercise,
  GradingPolicy,
  MatchingExercise,
  MultipleChoiceExercise,
  MultipleSelectExercise,
  SentenceOrderExercise,
} from "@deutschtrainer/shared-types";

export interface TextNormalizationOptions {
  caseSensitive: boolean;
  ignorePunctuation: boolean;
  normalizeGermanCharacters: boolean;
}

export interface GradingResult<TNormalized = unknown, TAccepted = unknown> {
  score: number;
  isCorrect: boolean;
  normalizedAnswer: TNormalized;
  acceptedAnswer: TAccepted;
  details: Record<string, number | string | boolean>;
}

const punctuationPattern = /[.,!?;:"'()[\]{}]/g;

export function normalizeAnswer(input: string, options: TextNormalizationOptions): string {
  let normalized = input.trim().normalize("NFC");

  if (options.normalizeGermanCharacters) {
    normalized = normalized
      .replaceAll("ae", "ä")
      .replaceAll("oe", "ö")
      .replaceAll("ue", "ü")
      .replaceAll("Ae", "Ä")
      .replaceAll("Oe", "Ö")
      .replaceAll("Ue", "Ü")
      .replaceAll("ss", "ß");
  }

  if (options.ignorePunctuation) {
    normalized = normalized.replace(punctuationPattern, "");
  }

  normalized = normalized.replace(/\s+/g, " ");

  return options.caseSensitive ? normalized : normalized.toLocaleLowerCase("de-DE");
}

export function gradeTextAnswer(
  userAnswer: string,
  acceptedAnswers: string[],
  policy: GradingPolicy,
): GradingResult<string, string> {
  const options: TextNormalizationOptions = {
    caseSensitive: policy.caseSensitive,
    ignorePunctuation: policy.ignorePunctuation,
    normalizeGermanCharacters: policy.normalizeGermanCharacters,
  };
  const normalizedAnswer = normalizeAnswer(userAnswer, options);
  const normalizedAcceptedAnswers = [...acceptedAnswers, ...policy.acceptedAlternatives].map(
    (answer) => normalizeAnswer(answer, options),
  );
  const matchedAnswer = normalizedAcceptedAnswers.find((answer) => answer === normalizedAnswer);

  return {
    score: matchedAnswer ? 100 : 0,
    isCorrect: Boolean(matchedAnswer),
    normalizedAnswer,
    acceptedAnswer: matchedAnswer ?? normalizedAcceptedAnswers[0] ?? "",
    details: { matched: Boolean(matchedAnswer) },
  };
}

export function gradeMultipleChoice(
  exercise: MultipleChoiceExercise,
  selectedOptionId: string,
): GradingResult<string, string> {
  const isCorrect = selectedOptionId === exercise.answer.optionId;

  return {
    score: isCorrect ? 100 : 0,
    isCorrect,
    normalizedAnswer: selectedOptionId,
    acceptedAnswer: exercise.answer.optionId,
    details: { matched: isCorrect },
  };
}

export function gradeMultipleSelect(
  exercise: MultipleSelectExercise,
  selectedOptionIds: string[],
): GradingResult<string[], string[]> {
  const selected = [...new Set(selectedOptionIds)].sort();
  const accepted = [...new Set(exercise.answer.optionIds)].sort();
  const correctSelections = selected.filter((id) => accepted.includes(id)).length;
  const incorrectSelections = selected.filter((id) => !accepted.includes(id)).length;
  const isCorrect = arraysEqual(selected, accepted);
  const partialScore = Math.max(
    0,
    Math.round(((correctSelections - incorrectSelections) / Math.max(accepted.length, 1)) * 100),
  );
  const score =
    isCorrect || (!exercise.requireAllCorrect && exercise.gradingPolicy.allowPartialCredit)
      ? isCorrect
        ? 100
        : partialScore
      : 0;

  return {
    score,
    isCorrect,
    normalizedAnswer: selected,
    acceptedAnswer: accepted,
    details: { correctSelections, incorrectSelections },
  };
}

export function gradeFillBlank(
  exercise: FillBlankExercise,
  userAnswer: string,
): GradingResult<string, string> {
  return gradeTextAnswer(userAnswer, exercise.answer.acceptedAnswers, exercise.gradingPolicy);
}

export function gradeErrorCorrection(
  exercise: ErrorCorrectionExercise,
  userAnswer: string,
): GradingResult<string, string> {
  return gradeTextAnswer(userAnswer, exercise.answer.acceptedAnswers, exercise.gradingPolicy);
}

export function gradeSentenceOrder(
  exercise: SentenceOrderExercise,
  segmentIds: string[],
): GradingResult<string[], string[]> {
  const accepted = exercise.answer.segmentIds;
  const correctPositions = segmentIds.filter((id, index) => id === accepted[index]).length;
  const isCorrect = arraysEqual(segmentIds, accepted);
  const score = isCorrect
    ? 100
    : exercise.allowPartialCredit
      ? Math.round((correctPositions / Math.max(accepted.length, 1)) * 100)
      : 0;

  return {
    score,
    isCorrect,
    normalizedAnswer: segmentIds,
    acceptedAnswer: accepted,
    details: { correctPositions, totalPositions: accepted.length },
  };
}

export function gradeMatching(
  exercise: MatchingExercise,
  pairs: Record<string, string>,
): GradingResult<Record<string, string>, Record<string, string>> {
  const acceptedEntries = Object.entries(exercise.answer.pairs);
  const correctPairs = acceptedEntries.filter(
    ([leftId, rightId]) => pairs[leftId] === rightId,
  ).length;
  const isCorrect =
    correctPairs === acceptedEntries.length && Object.keys(pairs).length === acceptedEntries.length;
  const score = isCorrect
    ? 100
    : exercise.allowPartialCredit
      ? Math.round((correctPairs / Math.max(acceptedEntries.length, 1)) * 100)
      : 0;

  return {
    score,
    isCorrect,
    normalizedAnswer: pairs,
    acceptedAnswer: exercise.answer.pairs,
    details: { correctPairs, totalPairs: acceptedEntries.length },
  };
}

export function gradeFixedExercise(exercise: FixedExercise, answer: unknown): GradingResult {
  switch (exercise.type) {
    case "multiple_choice":
      return gradeMultipleChoice(exercise, typeof answer === "string" ? answer : "");
    case "multiple_select":
      return gradeMultipleSelect(
        exercise,
        Array.isArray(answer)
          ? answer.filter((value): value is string => typeof value === "string")
          : [],
      );
    case "fill_blank":
      return gradeFillBlank(exercise, typeof answer === "string" ? answer : "");
    case "sentence_order":
      return gradeSentenceOrder(
        exercise,
        Array.isArray(answer)
          ? answer.filter((value): value is string => typeof value === "string")
          : [],
      );
    case "matching":
      return gradeMatching(exercise, isStringRecord(answer) ? answer : {});
    case "error_correction":
      return gradeErrorCorrection(exercise, typeof answer === "string" ? answer : "");
  }
}

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}
