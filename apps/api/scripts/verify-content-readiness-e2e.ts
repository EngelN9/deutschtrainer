import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = requireEnvironment("SUPABASE_URL");
const serviceRoleKey = requireEnvironment("SUPABASE_SERVICE_ROLE_KEY");
const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const exercisesResult = await service
  .from("exercises")
  .select("id, level, type")
  .eq("source_type", "human")
  .eq("review_status", "approved")
  .eq("status", "published")
  .is("deleted_at", null);
assertDatabaseSuccess(exercisesResult.error, "read release-ready exercises");

const exercises = exercisesResult.data;
assert.equal(exercises.length, 100, "MVP must contain exactly 100 approved human exercises");

const levelCounts = countBy(exercises, (exercise) => exercise.level);
assert.deepEqual(levelCounts, { B1: 50, B2: 25, C1: 13, C2: 12 });

const typeCounts = countBy(exercises, (exercise) => exercise.type);
for (const requiredType of [
  "multiple_choice",
  "multiple_select",
  "fill_blank",
  "sentence_order",
  "matching",
  "error_correction",
  "translation",
  "free_response",
]) {
  assert.ok((typeCounts[requiredType] ?? 0) >= 2, `${requiredType} needs at least two exercises`);
}

const answerResult = await service
  .from("exercise_answers")
  .select("exercise_id")
  .in(
    "exercise_id",
    exercises.map((exercise) => exercise.id),
  );
assertDatabaseSuccess(answerResult.error, "read release-ready answer keys");

const answeredExerciseIds = new Set(answerResult.data.map((answer) => answer.exercise_id));
assert.equal(answeredExerciseIds.size, exercises.length, "every exercise must have an answer row");

console.log(
  JSON.stringify(
    {
      approvedHumanExercises: exercises.length,
      answeredExercises: answeredExerciseIds.size,
      levelCounts,
      typeCounts,
    },
    null,
    2,
  ),
);

function countBy<T>(items: T[], keyOf: (item: T) => string): Record<string, number> {
  return Object.fromEntries(
    [
      ...items.reduce((counts, item) => {
        const key = keyOf(item);
        counts.set(key, (counts.get(key) ?? 0) + 1);
        return counts;
      }, new Map<string, number>()),
    ].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function assertDatabaseSuccess(
  error: { message?: string } | null,
  operation: string,
): asserts error is null {
  assert.equal(error, null, `${operation}: ${error?.message ?? "unknown database error"}`);
}
