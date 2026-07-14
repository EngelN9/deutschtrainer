import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  completeReviewResponseSchema,
  courseDetailResponseSchema,
  courseListResponseSchema,
  lessonDetailResponseSchema,
  progressResponseSchema,
  reviewQueueResponseSchema,
  submitAttemptResponseSchema,
} from "@deutschtrainer/validation";

const supabaseUrl = requireEnvironment("SUPABASE_URL");
const anonKey = requireEnvironment("SUPABASE_ANON_KEY");
const serviceRoleKey = requireEnvironment("SUPABASE_SERVICE_ROLE_KEY");
const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:8787";

const service = createClient(supabaseUrl, serviceRoleKey, clientOptions());
const learnerA = createClient(supabaseUrl, anonKey, clientOptions());
const learnerB = createClient(supabaseUrl, anonKey, clientOptions());
const createdUserIds: string[] = [];

try {
  const catalogResponse = await fetch(`${apiBaseUrl}/courses`);
  assert.equal(catalogResponse.status, 200);
  assert.match(catalogResponse.headers.get("cache-control") ?? "", /max-age=60/);
  const catalog = courseListResponseSchema.parse(await catalogResponse.json());
  assert.equal(catalog.source, "api");
  assert.equal(catalog.courses.length, 4);

  const levelCatalog = courseListResponseSchema.parse(
    await readSuccessfulJson(await fetch(`${apiBaseUrl}/courses?level=C2`), "filter courses"),
  );
  assert.equal(levelCatalog.courses.length, 1);
  assert.equal(levelCatalog.courses[0]?.level, "C2");

  const firstCourse = catalog.courses[0];
  const firstLesson = firstCourse?.units[0]?.lessons[0];
  assert.ok(firstCourse && firstLesson);
  const courseDetail = courseDetailResponseSchema.parse(
    await readSuccessfulJson(
      await fetch(`${apiBaseUrl}/courses/${firstCourse.id}`),
      "read course detail",
    ),
  );
  const lessonDetail = lessonDetailResponseSchema.parse(
    await readSuccessfulJson(
      await fetch(`${apiBaseUrl}/lessons/${firstLesson.id}`),
      "read lesson detail",
    ),
  );
  assert.equal(courseDetail.course.id, firstCourse.id);
  assert.equal(lessonDetail.lesson.id, firstLesson.id);

  const fixedExercise = catalog.courses
    .flatMap((course) => course.units)
    .flatMap((unit) => unit.lessons)
    .flatMap((lesson) => lesson.activities)
    .flatMap((activity) => activity.exercises)
    .find((exercise) => exercise.type === "multiple_choice");
  assert.ok(fixedExercise && fixedExercise.type === "multiple_choice");
  const correctOptionId = fixedExercise.answer.optionId;
  const wrongOptionId = fixedExercise.options.find((option) => option.id !== correctOptionId)?.id;
  assert.ok(wrongOptionId);

  const stamp = Date.now();
  const password = "Phase9-test-only-Strong-42!";
  const userA = await createUser(`phase9-${stamp}-a@example.test`, password, "Phase 9 A");
  const userB = await createUser(`phase9-${stamp}-b@example.test`, password, "Phase 9 B");
  const tokenA = await signIn(learnerA, userA.email, password);
  const tokenB = await signIn(learnerB, userB.email, password);

  const unauthenticatedProgress = await fetch(`${apiBaseUrl}/users/me/progress`);
  assert.equal(unauthenticatedProgress.status, 401);

  const attemptKey = `phase9-attempt-${stamp}`;
  const firstAttempt = submitAttemptResponseSchema.parse(
    await postApi(tokenA, "/attempts", {
      exerciseId: fixedExercise.id,
      answer: wrongOptionId,
      durationMs: 1500,
      usedHint: false,
      mode: "lesson",
      idempotencyKey: attemptKey,
    }),
  );
  assert.equal(firstAttempt.gradingResult.score, 0);
  assert.equal(firstAttempt.gradingResult.isCorrect, false);
  assert.equal(firstAttempt.idempotentReplay, false);

  const replay = submitAttemptResponseSchema.parse(
    await postApi(tokenA, "/attempts", {
      exerciseId: fixedExercise.id,
      answer: correctOptionId,
      durationMs: 900,
      usedHint: false,
      mode: "lesson",
      idempotencyKey: attemptKey,
    }),
  );
  assert.equal(replay.attemptId, firstAttempt.attemptId);
  assert.equal(replay.gradingResult.score, 0);
  assert.equal(replay.idempotentReplay, true);

  const profileA = await readProfileId(userA.id);
  const storedAttempt = await service
    .from("attempts")
    .select("score, is_correct")
    .eq("id", firstAttempt.attemptId)
    .single();
  assertDatabaseSuccess(storedAttempt.error, "read authoritative attempt");
  assert.equal(Number(storedAttempt.data.score), 0);
  assert.equal(storedAttempt.data.is_correct, false);

  const progressA = progressResponseSchema.parse(await getApi(tokenA, "/users/me/progress"));
  const progressB = progressResponseSchema.parse(await getApi(tokenB, "/users/me/progress"));
  assert.equal(progressA.attempts.length, 1);
  assert.equal(progressA.attempts[0]?.userId, profileA);
  assert.equal(progressB.attempts.length, 0);

  const dueBefore = encodeURIComponent(new Date(Date.now() + 60_000).toISOString());
  const reviewsA = reviewQueueResponseSchema.parse(
    await getApi(tokenA, `/users/me/reviews?status=scheduled&dueBefore=${dueBefore}`),
  );
  assert.ok(reviewsA.reviews.length >= 1);
  const review = reviewsA.reviews.find((entry) => entry.exerciseId === fixedExercise.id);
  assert.ok(review);

  const crossUserComplete = await fetch(`${apiBaseUrl}/reviews/${review.id}/complete`, {
    method: "POST",
    headers: { authorization: `Bearer ${tokenB}`, "content-type": "application/json" },
    body: JSON.stringify({
      answer: correctOptionId,
      durationMs: 800,
      usedHint: false,
      idempotencyKey: `phase9-cross-user-${stamp}`,
    }),
  });
  assert.equal(crossUserComplete.status, 404);

  const completed = completeReviewResponseSchema.parse(
    await postApi(tokenA, `/reviews/${review.id}/complete`, {
      answer: correctOptionId,
      durationMs: 800,
      usedHint: false,
      idempotencyKey: `phase9-review-${stamp}`,
    }),
  );
  assert.equal(completed.reviewId, review.id);
  assert.equal(completed.attempt.gradingResult.isCorrect, true);
  assert.ok(completed.nextReviewAt);

  const reviewStatus = await service
    .from("review_queue")
    .select("status")
    .eq("id", review.id)
    .single();
  assertDatabaseSuccess(reviewStatus.error, "read completed review");
  assert.equal(reviewStatus.data.status, "completed");

  const directRpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/record_fixed_attempt`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${tokenA}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  });
  assert.equal(directRpcResponse.status, 404);

  console.log(
    JSON.stringify(
      {
        publicCourseCount: catalog.courses.length,
        levelFilter: levelCatalog.courses[0]?.level,
        publicCacheEnabled: true,
        unauthenticatedProgressStatus: unauthenticatedProgress.status,
        authoritativeScore: firstAttempt.gradingResult.score,
        idempotentReplay: replay.idempotentReplay,
        learnerAAttempts: progressA.attempts.length,
        learnerBAttempts: progressB.attempts.length,
        crossUserReviewStatus: crossUserComplete.status,
        completedReview: completed.status,
        nextReviewScheduled: Boolean(completed.nextReviewAt),
        directRpcStatus: directRpcResponse.status,
      },
      null,
      2,
    ),
  );
} finally {
  await Promise.allSettled(createdUserIds.map((userId) => service.auth.admin.deleteUser(userId)));
}

async function createUser(email: string, password: string, displayName: string) {
  const result = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  assertDatabaseSuccess(result.error, "create local integration user");
  assert.ok(result.data.user.email);
  createdUserIds.push(result.data.user.id);
  return { id: result.data.user.id, email: result.data.user.email };
}

async function signIn(client: SupabaseClient, email: string, password: string): Promise<string> {
  const result = await client.auth.signInWithPassword({ email, password });
  assertDatabaseSuccess(result.error, "sign in local integration user");
  assert.ok(result.data.session?.access_token);
  return result.data.session.access_token;
}

async function readProfileId(authUserId: string): Promise<string> {
  const result = await service
    .from("profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();
  assertDatabaseSuccess(result.error, "read learner profile");
  return result.data.id;
}

async function getApi(token: string, path: string): Promise<unknown> {
  return readSuccessfulJson(
    await fetch(`${apiBaseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } }),
    `GET ${path}`,
  );
}

async function postApi(token: string, path: string, body: unknown): Promise<unknown> {
  return readSuccessfulJson(
    await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    `POST ${path}`,
  );
}

async function readSuccessfulJson(response: Response, operation: string): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`${operation} failed (${response.status}): ${await response.text()}`);
  }
  return (await response.json()) as unknown;
}

function clientOptions() {
  return { auth: { autoRefreshToken: false, persistSession: false } } as const;
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
