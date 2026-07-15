import assert from "node:assert/strict";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  notificationPreferencesResponseSchema,
  userSettingsResponseSchema,
} from "@deutschtrainer/validation";

loadEnvFile(fileURLToPath(new URL("../../../.env", import.meta.url)));

const supabaseUrl = requireEnvironment("SUPABASE_URL");
const anonKey = requireEnvironment("SUPABASE_ANON_KEY");
const serviceRoleKey = requireEnvironment("SUPABASE_SERVICE_ROLE_KEY");
const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:8787";

const service = createClient(supabaseUrl, serviceRoleKey, clientOptions());
const learnerA = createClient(supabaseUrl, anonKey, clientOptions());
const learnerB = createClient(supabaseUrl, anonKey, clientOptions());
const createdUserIds: string[] = [];

try {
  const stamp = Date.now();
  const password = "Phase11-test-only-Strong-42!";
  const userA = await createUser(
    `phase11-${stamp}-a@example.test`,
    password,
    "Phase 11 A",
    "Asia/Taipei",
  );
  const userB = await createUser(
    `phase11-${stamp}-b@example.test`,
    password,
    "Phase 11 B",
    "Europe/Berlin",
  );
  const tokenA = await signIn(learnerA, userA.email, password);
  const tokenB = await signIn(learnerB, userB.email, password);

  const unauthenticated = await fetch(`${apiBaseUrl}/users/me/settings`);
  assert.equal(unauthenticated.status, 401);

  const initialA = userSettingsResponseSchema.parse(await getApi(tokenA, "/users/me/settings"));
  const initialB = userSettingsResponseSchema.parse(await getApi(tokenB, "/users/me/settings"));
  assert.equal(initialA.profile.onboardingCompleted, false);
  assert.equal(initialA.notifications.timezone, "Asia/Taipei");
  assert.equal(initialB.notifications.timezone, "Europe/Berlin");

  const onboardedA = userSettingsResponseSchema.parse(
    await putApi(tokenA, "/users/me/onboarding", {
      currentLevel: "C1",
      targetLevel: "C2",
      dailyMinutes: 45,
      learningGoals: ["work", "study"],
      notificationsEnabled: true,
    }),
  );
  assert.equal(onboardedA.profile.onboardingCompleted, true);
  assert.equal(onboardedA.learning.currentLevel, "C1");
  assert.equal(onboardedA.learning.dailyMinutes, 45);
  assert.deepEqual(onboardedA.learning.learningGoals, ["work", "study"]);

  const updatedA = notificationPreferencesResponseSchema.parse(
    await putApi(tokenA, "/users/me/notification-preferences", {
      notificationsEnabled: true,
      dailyReminderEnabled: true,
      dailyReminderTime: "21:30",
      reviewReminderEnabled: false,
      inactivityReminderEnabled: true,
      inactivityDays: 7,
      writingCompleteEnabled: true,
      newCourseEnabled: false,
      goalCompleteEnabled: true,
      timezone: "Europe/Berlin",
    }),
  );
  assert.equal(updatedA.notifications.dailyReminderTime, "21:30");
  assert.equal(updatedA.notifications.inactivityDays, 7);
  assert.equal(updatedA.notifications.timezone, "Europe/Berlin");

  const persistedA = userSettingsResponseSchema.parse(await getApi(tokenA, "/users/me/settings"));
  const persistedB = userSettingsResponseSchema.parse(await getApi(tokenB, "/users/me/settings"));
  assert.equal(persistedA.notifications.reviewReminderEnabled, false);
  assert.equal(persistedB.profile.onboardingCompleted, false);
  assert.equal(persistedB.notifications.dailyReminderTime, "20:00");

  const profileA = await readProfileId(userA.id);
  const crossUserPreferences = await learnerB
    .from("user_preferences")
    .select("user_id")
    .eq("user_id", profileA);
  assertDatabaseSuccess(crossUserPreferences.error, "query cross-user preferences");
  assert.equal(crossUserPreferences.data.length, 0);

  const directPreferenceWrite = await fetch(
    `${supabaseUrl}/rest/v1/user_preferences?user_id=eq.${profileA}`,
    {
      method: "PATCH",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${tokenA}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ notifications_enabled: false }),
    },
  );
  assert.ok([401, 403].includes(directPreferenceWrite.status));

  const directServiceRpc = await fetch(
    `${supabaseUrl}/rest/v1/rpc/update_notification_preferences_service`,
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${tokenA}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );
  assert.ok([403, 404].includes(directServiceRpc.status));

  const storedProfile = await service
    .from("profiles")
    .select("timezone, onboarding_completed")
    .eq("id", profileA)
    .single();
  assertDatabaseSuccess(storedProfile.error, "read persisted profile settings");
  assert.equal(storedProfile.data.timezone, "Europe/Berlin");
  assert.equal(storedProfile.data.onboarding_completed, true);

  console.log(
    JSON.stringify(
      {
        unauthenticatedStatus: unauthenticated.status,
        learnerAOnboarded: onboardedA.profile.onboardingCompleted,
        learnerALevel: `${onboardedA.learning.currentLevel}-${onboardedA.learning.targetLevel}`,
        learnerAReminderTime: updatedA.notifications.dailyReminderTime,
        learnerATimezone: updatedA.notifications.timezone,
        learnerBOnboarded: persistedB.profile.onboardingCompleted,
        crossUserPreferenceRows: crossUserPreferences.data.length,
        directPreferenceWriteStatus: directPreferenceWrite.status,
        directServiceRpcStatus: directServiceRpc.status,
      },
      null,
      2,
    ),
  );
} finally {
  await Promise.allSettled(createdUserIds.map((userId) => service.auth.admin.deleteUser(userId)));
}

async function createUser(email: string, password: string, displayName: string, timezone: string) {
  const result = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, timezone },
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

async function putApi(token: string, path: string, body: unknown): Promise<unknown> {
  return readSuccessfulJson(
    await fetch(`${apiBaseUrl}${path}`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    `PUT ${path}`,
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
  error: { message?: string } | null,
  operation: string,
): asserts error is null {
  assert.equal(error, null, `${operation}: ${error?.message ?? "unknown database error"}`);
}
