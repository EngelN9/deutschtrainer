import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

loadLocalEnvironmentFile();

const supabaseUrl = requiredEnvironment("SUPABASE_URL", "http://127.0.0.1:54321");
const serviceRoleKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = requiredEnvironment("SUPABASE_ANON_KEY");
const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const email = `quota-${randomUUID()}@example.test`;
const password = `Quota-${randomUUID()}-A1!`;

const reservationResultSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
  reservationId: z.string().uuid().optional(),
  generation: z.number().int().positive().optional(),
});
const providerResultSchema = z.object({ allowed: z.boolean(), reason: z.string().optional() });

const created = await serviceClient.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
assert.ifError(created.error);
assert.ok(created.data.user);
let verificationSummary:
  | {
      clientBoundary: "denied";
      concurrentAllowed: number;
      concurrentDenied: number;
      consumedQuotaRows: number;
      globalProviderCallsAllowed: number;
    }
  | undefined;

try {
  const profileResult = await serviceClient
    .from("profiles")
    .select("id")
    .eq("auth_user_id", created.data.user.id)
    .single();
  assert.ifError(profileResult.error);
  const profileId = z.string().uuid().parse(profileResult.data.id);

  const parallel = await Promise.all(
    Array.from({ length: 6 }, (_, index) =>
      reserveQuota(profileId, "evaluate_response", `parallel-quota-${index}`, 5),
    ),
  );
  assert.equal(parallel.filter((result) => result.allowed).length, 5);
  assert.equal(parallel.filter((result) => result.reason === "USER_LIMIT").length, 1);

  const allowedParallel = parallel.filter(
    (
      result,
    ): result is z.infer<typeof reservationResultSchema> & {
      reservationId: string;
      generation: number;
    } => result.allowed && Boolean(result.reservationId) && Boolean(result.generation),
  );
  await finalize(allowedParallel[0]!, "consumed");
  await Promise.all(
    allowedParallel.slice(1).map((reservation) => finalize(reservation, "released")),
  );

  const replayKey = "parallel-idempotency-key";
  const duplicate = await Promise.all([
    reserveQuota(profileId, "evaluate_writing", replayKey, 2),
    reserveQuota(profileId, "evaluate_writing", replayKey, 2),
  ]);
  assert.equal(duplicate.filter((result) => result.allowed).length, 1);
  assert.equal(duplicate.filter((result) => result.reason === "IN_PROGRESS").length, 1);
  const firstDuplicate = duplicate.find(
    (
      result,
    ): result is z.infer<typeof reservationResultSchema> & {
      reservationId: string;
      generation: number;
    } => result.allowed && Boolean(result.reservationId) && Boolean(result.generation),
  );
  assert.ok(firstDuplicate);
  await finalize(firstDuplicate, "released");
  const retried = await reserveQuota(profileId, "evaluate_writing", replayKey, 2);
  assert.equal(retried.allowed, true);
  assert.equal(retried.generation, firstDuplicate.generation + 1);
  await finalize(requiredReservation(retried), "released");

  const providerQuota = requiredReservation(
    await reserveQuota(profileId, "text_to_speech", "provider-hard-limit", 5),
  );
  const providerOne = await reserveProviderCall(providerQuota, 1, 2);
  const providerTwo = await reserveProviderCall(providerQuota, 2, 2);
  const providerThree = await reserveProviderCall(providerQuota, 3, 2);
  assert.equal(providerOne.allowed, true);
  assert.equal(providerTwo.allowed, true);
  assert.equal(providerThree.allowed, false);
  assert.equal(providerThree.reason, "GLOBAL_LIMIT");
  await finalize(providerQuota, "released");

  const usageResult = await serviceClient
    .from("ai_quota_reservations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profileId)
    .eq("status", "consumed");
  assert.ifError(usageResult.error);
  assert.equal(usageResult.count, 1);

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signedIn = await userClient.auth.signInWithPassword({ email, password });
  assert.ifError(signedIn.error);
  const privateRead = await userClient.from("ai_quota_reservations").select("id").limit(1);
  assert.ok(privateRead.error, "authenticated clients must not read quota reservations");
  const privateRpc = await userClient.rpc("reserve_ai_quota_service", {
    p_user_id: profileId,
    p_feature: "evaluate_response",
    p_idempotency_key: "client-must-not-reserve",
    p_user_limit: 5,
  });
  assert.ok(privateRpc.error, "authenticated clients must not execute quota reservation RPCs");

  verificationSummary = {
    concurrentAllowed: 5,
    concurrentDenied: 1,
    consumedQuotaRows: 1,
    globalProviderCallsAllowed: 2,
    clientBoundary: "denied",
  };
} finally {
  await serviceClient.auth.admin.deleteUser(created.data.user.id);
}

const retainedProviderCalls = await serviceClient
  .from("ai_provider_call_reservations")
  .select("id", { count: "exact", head: true })
  .is("quota_reservation_id", null);
assert.ifError(retainedProviderCalls.error);
assert.ok(
  (retainedProviderCalls.count ?? 0) >= 2,
  "account deletion must not reduce the global provider-call hard-cap evidence",
);
assert.ok(verificationSummary);
console.log(
  JSON.stringify({
    status: "ok",
    ...verificationSummary,
    providerCallsRetainedAfterAccountDeletion: retainedProviderCalls.count,
  }),
);

async function reserveQuota(
  userId: string,
  feature: "evaluate_response" | "evaluate_writing" | "text_to_speech" | "transcribe_audio",
  idempotencyKey: string,
  userLimit: number,
) {
  const result = await serviceClient.rpc("reserve_ai_quota_service", {
    p_user_id: userId,
    p_feature: feature,
    p_idempotency_key: idempotencyKey,
    p_user_limit: userLimit,
  });
  assert.ifError(result.error);
  return reservationResultSchema.parse(result.data);
}

async function reserveProviderCall(
  reservation: { reservationId: string; generation: number },
  providerAttempt: number,
  globalLimit: number,
) {
  const result = await serviceClient.rpc("reserve_ai_provider_call_service", {
    p_reservation_id: reservation.reservationId,
    p_generation: reservation.generation,
    p_provider_attempt: providerAttempt,
    p_global_limit: globalLimit,
  });
  assert.ifError(result.error);
  return providerResultSchema.parse(result.data);
}

async function finalize(
  reservation: { reservationId: string; generation: number },
  outcome: "consumed" | "released",
) {
  const result = await serviceClient.rpc("finalize_ai_quota_service", {
    p_reservation_id: reservation.reservationId,
    p_generation: reservation.generation,
    p_outcome: outcome,
  });
  assert.ifError(result.error);
}

function requiredReservation(result: z.infer<typeof reservationResultSchema>) {
  assert.equal(result.allowed, true);
  assert.ok(result.reservationId);
  assert.ok(result.generation);
  return { reservationId: result.reservationId, generation: result.generation };
}

function requiredEnvironment(name: string, fallback?: string): string {
  const value = process.env[name]?.trim() || fallback;
  if (!value || value.startsWith("replace-with-")) {
    throw new Error(`${name} is required for local AI quota verification.`);
  }
  return value;
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

function loadLocalEnvironmentFile(): void {
  for (const candidate of [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "..", "..", ".env"),
  ]) {
    try {
      loadEnvFile(candidate);
      return;
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
    }
  }
}
