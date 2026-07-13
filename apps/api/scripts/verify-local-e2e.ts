import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { evaluateResponseResponseSchema } from "@deutschtrainer/validation";

const supabaseUrl = requireEnvironment("SUPABASE_URL");
const anonKey = requireEnvironment("SUPABASE_ANON_KEY");
const serviceRoleKey = requireEnvironment("SUPABASE_SERVICE_ROLE_KEY");
const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:8787";

const admin = createClient(supabaseUrl, serviceRoleKey, clientOptions());
const anonymous = createClient(supabaseUrl, anonKey, clientOptions());
const learnerA = createClient(supabaseUrl, anonKey, clientOptions());
const learnerB = createClient(supabaseUrl, anonKey, clientOptions());
const createdUserIds: string[] = [];

try {
  const stamp = Date.now();
  const password = "Phase5-test-only-Strong-42!";
  const userA = await createUser(`phase5-${stamp}-a@example.test`, password, "Phase 5 A");
  const userB = await createUser(`phase5-${stamp}-b@example.test`, password, "Phase 5 B");
  const tokenA = await signIn(learnerA, userA.email, password);
  const tokenB = await signIn(learnerB, userB.email, password);

  const profileResult = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", userA.id)
    .single();
  assertDatabaseSuccess(profileResult.error, "read learner profile");
  const learnerProfileId = profileResult.data.id;

  const exerciseResult = await admin
    .from("exercises")
    .select("id")
    .eq("type", "translation")
    .eq("level", "B1")
    .eq("status", "published")
    .eq("review_status", "approved")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  assertDatabaseSuccess(exerciseResult.error, "read Phase 5 exercise");
  const exerciseId = exerciseResult.data.id;

  const responseDe = "Obwohl es heute regnet, ich fahre zur Arbeit, weil ich heute muss arbeiten.";
  const firstKey = `phase5-e2e-${stamp}-first`;
  const first = await evaluate(tokenA, {
    exerciseId,
    responseDe,
    durationMs: 32_000,
    usedHint: false,
    mode: "practice",
    idempotencyKey: firstKey,
  });
  assert.equal(first.status, "completed");
  assert.equal(first.cached, false);
  assert.equal(first.idempotentReplay, false);
  assert.ok(first.attemptId);
  assert.ok(first.feedbackId);

  const replay = await evaluate(tokenA, {
    exerciseId,
    responseDe,
    durationMs: 32_000,
    usedHint: false,
    mode: "practice",
    idempotencyKey: firstKey,
  });
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.attemptId, first.attemptId);

  const cached = await evaluate(tokenA, {
    exerciseId,
    responseDe,
    durationMs: 35_000,
    usedHint: false,
    mode: "practice",
    idempotencyKey: `phase5-e2e-${stamp}-cache`,
  });
  assert.equal(cached.status, "completed");
  assert.equal(cached.cached, true);
  assert.notEqual(cached.attemptId, first.attemptId);

  const feedbackRows = await countRows(admin, "ai_feedback", learnerProfileId);
  const usageRows = await countRows(admin, "ai_usage_logs", learnerProfileId);
  const attemptRows = await countRows(admin, "attempts", learnerProfileId);
  const errorRows = await countRows(admin, "error_records", learnerProfileId);
  const reviewRows = await countRows(admin, "review_queue", learnerProfileId);
  assert.equal(feedbackRows, 2);
  assert.equal(usageRows, 2);
  assert.equal(attemptRows, 2);
  assert.ok(errorRows >= 2);
  assert.ok(reviewRows >= 1);

  const protectedAnswerResult = await anonymous
    .from("exercise_answers")
    .select("id")
    .eq("exercise_id", exerciseId);
  assertDatabaseSuccess(protectedAnswerResult.error, "query protected answers anonymously");
  assert.equal(protectedAnswerResult.data.length, 0);

  const crossUserResult = await learnerB
    .from("ai_feedback")
    .select("id")
    .eq("user_id", learnerProfileId);
  assertDatabaseSuccess(crossUserResult.error, "query cross-user AI feedback");
  assert.equal(crossUserResult.data.length, 0);

  const directRpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/record_ai_attempt`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${tokenB}`,
      "content-type": "application/json",
    },
    body: "{}",
  });
  assert.ok([401, 403, 404].includes(directRpcResponse.status));

  console.log(
    JSON.stringify(
      {
        firstStatus: first.status,
        firstScore: first.feedback.score,
        replay: replay.idempotentReplay,
        cacheHit: cached.cached,
        feedbackRows,
        usageRows,
        attemptRows,
        errorRows,
        reviewRows,
        anonymousProtectedAnswers: protectedAnswerResult.data.length,
        crossUserFeedbackRows: crossUserResult.data.length,
        authenticatedDirectRpcStatus: directRpcResponse.status,
      },
      null,
      2,
    ),
  );
} finally {
  await Promise.all(
    createdUserIds.map(async (userId) => {
      const result = await admin.auth.admin.deleteUser(userId, false);
      if (result.error) {
        console.error(`Could not delete local integration user ${userId}: ${result.error.message}`);
      }
    }),
  );
}

async function createUser(email: string, password: string, displayName: string) {
  const result = await admin.auth.admin.createUser({
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

async function evaluate(accessToken: string, body: Record<string, unknown>) {
  const response = await fetch(`${apiBaseUrl}/ai/evaluate-response`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Evaluation failed (${response.status}): ${await response.text()}`);
  }
  return evaluateResponseResponseSchema.parse(await response.json());
}

async function countRows(
  client: SupabaseClient,
  table: string,
  learnerProfileId: string,
): Promise<number> {
  const result = await client
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", learnerProfileId);
  assertDatabaseSuccess(result.error, `count ${table}`);
  return result.count ?? 0;
}

function clientOptions() {
  return { auth: { autoRefreshToken: false, persistSession: false } } as const;
}

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function assertDatabaseSuccess(
  error: { message: string } | null,
  operation: string,
): asserts error is null {
  if (error) {
    throw new Error(`Could not ${operation}: ${error.message}`);
  }
}
