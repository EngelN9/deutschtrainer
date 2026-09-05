import { execFileSync } from "node:child_process";
import type { SkillMastery } from "@deutschtrainer/shared-types";
import { calculateNextMastery, type AttemptSignal } from "./index";

/**
 * The mastery delta exists twice: here in TypeScript for mobile offline mode, and in
 * public.calculate_mastery_delta for every real API attempt. They drifted once already — #37
 * fixed the hint penalty in TypeScript while the SQL copy kept subtracting a flat 8, so correct
 * answers lowered mastery on the server and no test noticed, because none of them passed
 * usedHint: true.
 *
 * Asserting hand-written expected values would drift the same way, so this compares the two
 * implementations against each other. Skipped when the local Supabase stack is not running.
 */

const DB_CONTAINER = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_deutschtrainer-local";
const EXPECTED_SECONDS = 30;
// Mid-range so no case clamps at 0 or 100 and the raw delta stays observable.
const BASELINE = 50;

interface AttemptCase {
  isCorrect: boolean;
  usedHint: boolean;
  difficulty: number;
  slow: boolean;
}

function psql(query: string): string {
  return execFileSync(
    "docker",
    ["exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-X", "-At", "-c", query],
    { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  );
}

function stackIsRunning(): boolean {
  try {
    psql("select 1");
    return true;
  } catch {
    return false;
  }
}

function buildMatrix(): AttemptCase[] {
  const cases: AttemptCase[] = [];
  for (const difficulty of [1, 2, 3, 4, 5]) {
    for (const isCorrect of [true, false]) {
      for (const usedHint of [true, false]) {
        for (const slow of [true, false]) {
          cases.push({ isCorrect, usedHint, difficulty, slow });
        }
      }
    }
  }
  return cases;
}

// The penalty triggers strictly above expected * 1.5.
function durationMs(slow: boolean): number {
  return slow ? EXPECTED_SECONDS * 1000 * 2 : EXPECTED_SECONDS * 1000;
}

function typescriptDelta(attempt: AttemptCase): number {
  const previous = {
    masteryScore: BASELINE,
    confidenceScore: BASELINE,
    attemptCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    hintCount: 0,
    averageResponseTimeMs: 0,
    correctStreak: 0,
    incorrectStreak: 0,
  } as unknown as SkillMastery;
  const signal: AttemptSignal = {
    isCorrect: attempt.isCorrect,
    usedHint: attempt.usedHint,
    responseTimeMs: durationMs(attempt.slow),
    expectedResponseTimeMs: EXPECTED_SECONDS * 1000,
    difficulty: attempt.difficulty,
    score: attempt.isCorrect ? 100 : 0,
  };
  return calculateNextMastery(previous, signal).masteryScore - BASELINE;
}

function sqlDeltas(cases: AttemptCase[]): number[] {
  const rows = cases
    .map(
      (attempt, index) =>
        `(${index}, ${attempt.isCorrect}, ${attempt.usedHint}, ${attempt.difficulty}, ${durationMs(attempt.slow)}, ${EXPECTED_SECONDS})`,
    )
    .join(",");
  const query = `select public.calculate_mastery_delta(is_correct, used_hint, difficulty, duration_ms, estimated_seconds) from (values ${rows}) as t(idx, is_correct, used_hint, difficulty, duration_ms, estimated_seconds) order by idx;`;
  return psql(query)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(Number);
}

const describeWithStack = stackIsRunning() ? describe : describe.skip;

describeWithStack("mastery delta parity between TypeScript and SQL", () => {
  const cases = buildMatrix();

  it("exposes calculate_mastery_delta (run pnpm supabase:reset if this fails)", () => {
    const exists = psql(
      "select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'calculate_mastery_delta';",
    ).trim();
    expect(exists).toBe("1");
  });

  it("produces the same delta as the SQL implementation for every case", () => {
    const fromSql = sqlDeltas(cases);
    expect(fromSql).toHaveLength(cases.length);

    const mismatches = cases
      .map((attempt, index) => ({ attempt, ts: typescriptDelta(attempt), sql: fromSql[index]! }))
      .filter((row) => row.ts !== row.sql)
      .map(
        (row) =>
          `correct=${row.attempt.isCorrect} hint=${row.attempt.usedHint} difficulty=${row.attempt.difficulty} slow=${row.attempt.slow}: ts=${row.ts} sql=${row.sql}`,
      );

    expect(mismatches).toEqual([]);
  });

  it("never lowers mastery for a correct answer, in either implementation", () => {
    const fromSql = sqlDeltas(cases);
    const regressions = cases
      .map((attempt, index) => ({ attempt, ts: typescriptDelta(attempt), sql: fromSql[index]! }))
      .filter((row) => row.attempt.isCorrect && (row.ts <= 0 || row.sql <= 0))
      .map(
        (row) =>
          `hint=${row.attempt.usedHint} difficulty=${row.attempt.difficulty} slow=${row.attempt.slow}: ts=${row.ts} sql=${row.sql}`,
      );

    expect(regressions).toEqual([]);
  });
});
