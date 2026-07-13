import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { evaluateWritingResponseSchema } from "@deutschtrainer/validation";

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
  const password = "Phase6-test-only-Strong-42!";
  const userA = await createUser(`phase6-${stamp}-a@example.test`, password, "Phase 6 A");
  const userB = await createUser(`phase6-${stamp}-b@example.test`, password, "Phase 6 B");
  const tokenA = await signIn(learnerA, userA.email, password);
  const tokenB = await signIn(learnerB, userB.email, password);

  const profileResult = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", userA.id)
    .single();
  assertDatabaseSuccess(profileResult.error, "read learner profile");
  const learnerProfileId = profileResult.data.id;

  const promptResult = await admin
    .from("writing_prompts")
    .select("id, minimum_words, maximum_words")
    .eq("level", "B1")
    .eq("writing_type", "formal_email")
    .eq("status", "published")
    .eq("review_status", "approved")
    .single();
  assertDatabaseSuccess(promptResult.error, "read Phase 6 writing prompt");
  const promptId = promptResult.data.id;

  const rulesResult = await admin
    .from("writing_prompt_rules")
    .select("reference_version_de")
    .eq("prompt_id", promptId)
    .single();
  assertDatabaseSuccess(rulesResult.error, "read protected writing rules");

  const publicPrompts = await anonymous.from("writing_prompts").select("id").eq("id", promptId);
  assertDatabaseSuccess(publicPrompts.error, "read public writing prompt anonymously");
  assert.equal(publicPrompts.data.length, 1);

  const protectedRulesResponse = await fetch(
    `${supabaseUrl}/rest/v1/writing_prompt_rules?select=id&prompt_id=eq.${promptId}`,
    { headers: { apikey: anonKey, authorization: `Bearer ${anonKey}` } },
  );
  assert.ok([401, 403, 404].includes(protectedRulesResponse.status));

  const firstText =
    "Sehr geehrte Frau Berger, leider kann ich nächste Woche nicht am Unterricht teilnehmen, weil ich muss arbeiten. Mein Chef schickt mich von Montag bis Donnerstag nach Berlin. Könnten Sie mir bitte die Arbeitsblätter und Informationen zu den Hausaufgaben per E-Mail schicken? Außerdem möchte ich fragen, ob ich die versäumte Stunde am Freitag oder in der folgenden Woche nachholen kann. Vielen Dank für Ihre Unterstützung. Mit freundlichen Grüßen Lin Chen";
  const firstWordCount = countWords(firstText);
  assert.ok(firstWordCount >= promptResult.data.minimum_words);
  assert.ok(firstWordCount <= promptResult.data.maximum_words);

  const firstKey = `phase6-writing-${stamp}-v1`;
  const first = await evaluate(tokenA, {
    promptId,
    textDe: firstText,
    durationMs: 180_000,
    idempotencyKey: firstKey,
  });
  assert.equal(first.status, "completed");
  assert.equal(first.versionNumber, 1);
  assert.equal(first.feedback?.referenceVersion, null);
  assert.equal(first.feedback?.inlineErrors.length, 1);
  const firstError = first.feedback?.inlineErrors[0];
  assert.ok(firstError);
  assert.equal(
    firstText.slice(firstError.startOffset, firstError.endOffset),
    "weil ich muss arbeiten",
  );

  const replay = await evaluate(tokenA, {
    promptId,
    textDe: firstText,
    durationMs: 180_000,
    idempotencyKey: firstKey,
  });
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.versionId, first.versionId);

  const secondText = firstText.replace("weil ich muss arbeiten", "weil ich arbeiten muss");
  const second = await evaluate(tokenA, {
    promptId,
    submissionId: first.submissionId,
    textDe: secondText,
    durationMs: 120_000,
    idempotencyKey: `phase6-writing-${stamp}-v2`,
  });
  assert.equal(second.status, "completed");
  assert.equal(second.versionNumber, 2);
  assert.equal(second.submissionId, first.submissionId);
  assert.equal(second.feedback?.referenceVersion, rulesResult.data.reference_version_de);
  assert.deepEqual(second.feedback?.repeatedErrorTypes, []);

  const versionsResult = await admin
    .from("writing_versions")
    .select("version_number, text_de, diff_json, ai_feedback_id")
    .eq("submission_id", first.submissionId)
    .order("version_number");
  assertDatabaseSuccess(versionsResult.error, "read writing versions");
  assert.equal(versionsResult.data.length, 2);
  assert.equal(versionsResult.data[0]?.text_de, firstText);
  assert.equal(versionsResult.data[1]?.text_de, secondText);
  assert.ok(versionsResult.data.every((version) => version.ai_feedback_id));
  const secondDiff = versionsResult.data[1]?.diff_json;
  assert.ok(Array.isArray(secondDiff));
  assert.ok(secondDiff.some((change) => readKind(change) === "removed"));
  assert.ok(secondDiff.some((change) => readKind(change) === "added"));

  const submissionResult = await admin
    .from("writing_submissions")
    .select("status, current_version_id")
    .eq("id", first.submissionId)
    .single();
  assertDatabaseSuccess(submissionResult.error, "read writing submission");
  assert.equal(submissionResult.data.status, "completed");
  assert.equal(submissionResult.data.current_version_id, second.versionId);

  const crossUserSubmissions = await learnerB
    .from("writing_submissions")
    .select("id")
    .eq("id", first.submissionId);
  assertDatabaseSuccess(crossUserSubmissions.error, "query cross-user writing submissions");
  assert.equal(crossUserSubmissions.data.length, 0);

  const crossUserVersions = await learnerB
    .from("writing_versions")
    .select("id")
    .eq("submission_id", first.submissionId);
  assertDatabaseSuccess(crossUserVersions.error, "query cross-user writing versions");
  assert.equal(crossUserVersions.data.length, 0);

  const directRpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/prepare_writing_version`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${tokenB}`,
      "content-type": "application/json",
    },
    body: "{}",
  });
  assert.ok([401, 403, 404].includes(directRpcResponse.status));

  const usageBeforeDelete = await countRows(admin, "ai_usage_logs", learnerProfileId);
  assert.equal(usageBeforeDelete, 2);
  const deleteResult = await learnerA.rpc("delete_own_writing_submission", {
    p_submission_id: first.submissionId,
  });
  assertDatabaseSuccess(deleteResult.error, "delete own writing submission");
  assert.equal(deleteResult.data, true);
  assert.equal(await countRows(admin, "writing_submissions", learnerProfileId), 0);
  assert.equal(await countRows(admin, "writing_versions", learnerProfileId), 0);
  assert.equal(await countRows(admin, "ai_feedback", learnerProfileId), 0);
  assert.equal(await countRows(admin, "ai_usage_logs", learnerProfileId), usageBeforeDelete);

  console.log(
    JSON.stringify(
      {
        firstVersion: first.versionNumber,
        firstScore: first.feedback?.score,
        firstReferenceHidden: first.feedback?.referenceVersion === null,
        replay: replay.idempotentReplay,
        secondVersion: second.versionNumber,
        secondScore: second.feedback?.score,
        secondReferenceShown: second.feedback?.referenceVersion !== null,
        immutableVersionCount: versionsResult.data.length,
        publicPromptRows: publicPrompts.data.length,
        anonymousProtectedRuleStatus: protectedRulesResponse.status,
        crossUserSubmissionRows: crossUserSubmissions.data.length,
        crossUserVersionRows: crossUserVersions.data.length,
        authenticatedDirectRpcStatus: directRpcResponse.status,
        usageMetadataRetainedAfterDelete: usageBeforeDelete,
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
  const response = await fetch(`${apiBaseUrl}/ai/evaluate-writing`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Writing evaluation failed (${response.status}): ${await response.text()}`);
  }
  return evaluateWritingResponseSchema.parse(await response.json());
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

function countWords(text: string): number {
  return text.trim().split(/\s+/u).length;
}

function readKind(value: unknown): string | undefined {
  return typeof value === "object" && value !== null && "kind" in value
    ? String((value as { kind: unknown }).kind)
    : undefined;
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
