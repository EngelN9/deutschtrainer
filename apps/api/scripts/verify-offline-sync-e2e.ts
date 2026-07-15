import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { courseListResponseSchema, submitAttemptResponseSchema } from "@deutschtrainer/validation";

const supabaseUrl = requireEnvironment("SUPABASE_URL");
const anonKey = requireEnvironment("SUPABASE_ANON_KEY");
const serviceRoleKey = requireEnvironment("SUPABASE_SERVICE_ROLE_KEY");
const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:8787";
const clientOptions = { auth: { autoRefreshToken: false, persistSession: false } } as const;
const service = createClient(supabaseUrl, serviceRoleKey, clientOptions);
const learner = createClient(supabaseUrl, anonKey, clientOptions);
let authUserId: string | undefined;

try {
  const catalogResponse = await fetch(`${apiBaseUrl}/courses`);
  assert.equal(catalogResponse.status, 200);
  const catalog = courseListResponseSchema.parse(await catalogResponse.json());
  const exercise = catalog.courses
    .flatMap((course) => course.units)
    .flatMap((unit) => unit.lessons)
    .flatMap((lesson) => lesson.activities)
    .flatMap((activity) => activity.exercises)
    .find((candidate) => candidate.type === "multiple_choice");
  assert.ok(exercise && exercise.type === "multiple_choice");

  const stamp = Date.now();
  const email = `phase12-${stamp}@example.test`;
  const password = "Phase12-test-only-Strong-42!";
  const userResult = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Phase 12 Offline" },
  });
  assertDatabaseSuccess(userResult.error, "create offline sync learner");
  authUserId = userResult.data.user.id;

  const sessionResult = await learner.auth.signInWithPassword({ email, password });
  assertDatabaseSuccess(sessionResult.error, "sign in offline sync learner");
  const token = sessionResult.data.session?.access_token;
  assert.ok(token);

  const submittedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const idempotencyKey = `phase12-offline-${stamp}`;
  const first = submitAttemptResponseSchema.parse(
    await postApi(token, "/attempts", {
      exerciseId: exercise.id,
      exerciseVersion: exercise.version,
      answer: exercise.answer.optionId,
      durationMs: 1250,
      usedHint: false,
      mode: "lesson",
      idempotencyKey,
      submittedAt,
    }),
  );
  assert.equal(first.idempotentReplay, false);
  assert.equal(first.gradingResult.isCorrect, true);

  const storedAttempt = await service
    .from("attempts")
    .select("submitted_at")
    .eq("id", first.attemptId)
    .single();
  assertDatabaseSuccess(storedAttempt.error, "read offline attempt timestamp");
  assert.equal(new Date(storedAttempt.data.submitted_at).toISOString(), submittedAt);

  const storedReview = await service
    .from("review_queue")
    .select("scheduled_at, interval_days")
    .eq("source_attempt_id", first.attemptId);
  assertDatabaseSuccess(storedReview.error, "read offline review schedule");
  assert.ok(storedReview.data.length > 0);
  for (const review of storedReview.data) {
    const expectedReviewAt = new Date(submittedAt);
    expectedReviewAt.setUTCDate(expectedReviewAt.getUTCDate() + review.interval_days);
    assert.equal(new Date(review.scheduled_at).toISOString(), expectedReviewAt.toISOString());
  }

  const replay = submitAttemptResponseSchema.parse(
    await postApi(token, "/attempts", {
      exerciseId: exercise.id,
      exerciseVersion: exercise.version,
      answer: exercise.answer.optionId,
      durationMs: 1250,
      usedHint: false,
      mode: "lesson",
      idempotencyKey,
      submittedAt,
    }),
  );
  assert.equal(replay.attemptId, first.attemptId);
  assert.equal(replay.idempotentReplay, true);

  const staleVersion = await fetch(`${apiBaseUrl}/attempts`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      exerciseId: exercise.id,
      exerciseVersion: exercise.version + 1,
      answer: exercise.answer.optionId,
      durationMs: 1250,
      usedHint: false,
      mode: "lesson",
      idempotencyKey: `phase12-stale-version-${stamp}`,
      submittedAt,
    }),
  });
  assert.equal(staleVersion.status, 409);

  const tooOld = await fetch(`${apiBaseUrl}/attempts`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      exerciseId: exercise.id,
      exerciseVersion: exercise.version,
      answer: exercise.answer.optionId,
      durationMs: 1250,
      usedHint: false,
      mode: "lesson",
      idempotencyKey: `phase12-too-old-${stamp}`,
      submittedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  });
  assert.equal(tooOld.status, 400);

  const directRpc = await fetch(`${supabaseUrl}/rest/v1/rpc/record_fixed_attempt_sync_service`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  });
  assert.equal(directRpc.status, 404);

  console.log(
    JSON.stringify(
      {
        actualSubmittedAt: storedAttempt.data.submitted_at,
        expectedSubmittedAt: submittedAt,
        idempotentReplay: replay.idempotentReplay,
        reviewScheduledAt: storedReview.data.map((review) => review.scheduled_at),
        staleExerciseVersionStatus: staleVersion.status,
        staleTimestampStatus: tooOld.status,
        authenticatedDirectRpcStatus: directRpc.status,
      },
      null,
      2,
    ),
  );
} finally {
  if (authUserId) {
    await service.auth.admin.deleteUser(authUserId);
  }
}

async function postApi(token: string, path: string, body: unknown): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`POST ${path} failed (${response.status}): ${await response.text()}`);
  }
  return (await response.json()) as unknown;
}

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function assertDatabaseSuccess(
  error: { message: string } | null,
  operation: string,
): asserts error is null {
  if (error) throw new Error(`Could not ${operation}: ${error.message}`);
}
