import assert from "node:assert/strict";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ACCOUNT_DELETION_CONFIRMATION,
  accountDataExportResponseSchema,
  accountDeletionResponseSchema,
} from "@deutschtrainer/validation";

try {
  loadEnvFile(fileURLToPath(new URL("../../../.env", import.meta.url)));
} catch (error) {
  if (!isMissingFileError(error)) {
    throw error;
  }
}

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
  const password = "Account-data-test-only-Strong-42!";
  const userA = await createUser(`account-data-${stamp}-a@example.test`, password, "Account A");
  const userB = await createUser(`account-data-${stamp}-b@example.test`, password, "Account B");
  const tokenA = await signIn(learnerA, userA.email, password);
  const tokenB = await signIn(learnerB, userB.email, password);
  const profileA = await readProfileId(userA.id);
  const storagePath = `${userA.id}/account-deletion-test.webm`;

  const upload = await service.storage
    .from("speaking-audio")
    .upload(storagePath, new TextEncoder().encode("local integration fixture"), {
      contentType: "audio/webm",
      upsert: false,
    });
  assertDatabaseSuccess(upload.error, "upload account deletion fixture");

  const audioAsset = await service
    .from("audio_assets")
    .insert({
      owner_user_id: profileA,
      storage_bucket: "speaking-audio",
      storage_path: storagePath,
      source_type: "uploaded",
      license: "user_recording_private",
      content_type: "audio/webm",
      duration_ms: 1000,
    })
    .select("id")
    .single();
  assertDatabaseSuccess(audioAsset.error, "create account deletion audio metadata");

  const unauthenticatedExport = await fetch(`${apiBaseUrl}/users/me/export`);
  assert.equal(unauthenticatedExport.status, 401);

  const exportA = accountDataExportResponseSchema.parse(
    await getSuccessfulApi(tokenA, "/users/me/export"),
  );
  const exportB = accountDataExportResponseSchema.parse(
    await getSuccessfulApi(tokenB, "/users/me/export"),
  );
  assert.equal(exportA.profile.auth_user_id, userA.id);
  assert.equal(exportB.profile.auth_user_id, userB.id);
  assert.equal(exportA.collections.audioAssets.length, 1);
  assert.equal(exportB.collections.audioAssets.length, 0);
  assert.equal(exportA.audioFiles.length, 1);
  assert.ok(exportA.audioFiles[0]?.signedUrl.startsWith("http"));

  const crossUserDownload = await learnerB.storage.from("speaking-audio").download(storagePath);
  assert.ok(crossUserDownload.error);

  const invalidConfirmation = await fetch(`${apiBaseUrl}/users/me`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${tokenA}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ confirmation: "delete" }),
  });
  assert.equal(invalidConfirmation.status, 400);

  const deletion = accountDeletionResponseSchema.parse(
    await deleteSuccessfulApi(tokenA, {
      confirmation: ACCOUNT_DELETION_CONFIRMATION,
    }),
  );
  assert.equal(deletion.deleted, true);

  const deletedProfile = await service.from("profiles").select("id").eq("id", profileA);
  assertDatabaseSuccess(deletedProfile.error, "verify deleted profile");
  assert.equal(deletedProfile.data.length, 0);

  const deletedObject = await service.storage.from("speaking-audio").list(userA.id, {
    search: "account-deletion-test.webm",
  });
  assertDatabaseSuccess(deletedObject.error, "verify deleted storage object");
  assert.equal(deletedObject.data.length, 0);

  const deletedAuthUser = await service.auth.admin.getUserById(userA.id);
  assert.ok(deletedAuthUser.error);

  const oldTokenResponse = await fetch(`${apiBaseUrl}/users/me/export`, {
    headers: { authorization: `Bearer ${tokenA}` },
  });
  assert.equal(oldTokenResponse.status, 401);

  const survivorExport = accountDataExportResponseSchema.parse(
    await getSuccessfulApi(tokenB, "/users/me/export"),
  );
  assert.equal(survivorExport.profile.auth_user_id, userB.id);

  console.log(
    JSON.stringify(
      {
        unauthenticatedExportStatus: unauthenticatedExport.status,
        crossUserStorageDenied: Boolean(crossUserDownload.error),
        invalidConfirmationStatus: invalidConfirmation.status,
        accountDeleted: deletion.deleted,
        deletedProfileRows: deletedProfile.data.length,
        deletedStorageObjects: deletedObject.data.length,
        oldTokenStatus: oldTokenResponse.status,
        survivorExportOwnerMatched: survivorExport.profile.auth_user_id === userB.id,
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
    user_metadata: { display_name: displayName, timezone: "Asia/Taipei" },
  });
  assertDatabaseSuccess(result.error, "create local account-data user");
  assert.ok(result.data.user.email);
  createdUserIds.push(result.data.user.id);
  return { id: result.data.user.id, email: result.data.user.email };
}

async function signIn(client: SupabaseClient, email: string, password: string): Promise<string> {
  const result = await client.auth.signInWithPassword({ email, password });
  assertDatabaseSuccess(result.error, "sign in local account-data user");
  assert.ok(result.data.session?.access_token);
  return result.data.session.access_token;
}

async function readProfileId(authUserId: string): Promise<string> {
  const result = await service
    .from("profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();
  assertDatabaseSuccess(result.error, "read account-data profile");
  return result.data.id;
}

async function getSuccessfulApi(token: string, path: string): Promise<unknown> {
  return readSuccessfulJson(
    await fetch(`${apiBaseUrl}${path}`, {
      headers: { authorization: `Bearer ${token}` },
    }),
    `GET ${path}`,
  );
}

async function deleteSuccessfulApi(token: string, body: unknown): Promise<unknown> {
  return readSuccessfulJson(
    await fetch(`${apiBaseUrl}/users/me`, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
    "DELETE /users/me",
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

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}
