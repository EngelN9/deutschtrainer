import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  deleteSpeakingSubmissionResponseSchema,
  revealListeningTranscriptResponseSchema,
  submitDictationResponseSchema,
  textToSpeechResponseSchema,
  transcribeResponseSchema,
} from "@deutschtrainer/validation";

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
  const password = "Phase7-test-only-Strong-42!";
  const userA = await createUser(`phase7-${stamp}-a@example.test`, password, "Phase 7 A");
  const userB = await createUser(`phase7-${stamp}-b@example.test`, password, "Phase 7 B");
  const tokenA = await signIn(learnerA, userA.email, password);
  const tokenB = await signIn(learnerB, userB.email, password);

  const profileResult = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", userA.id)
    .single();
  assertDatabaseSuccess(profileResult.error, "read learner profile");
  const profileA = profileResult.data.id;

  const listeningResult = await anonymous
    .from("listening_assets")
    .select("id, tts_voice, comprehension_options_json")
    .eq("level", "B1")
    .eq("status", "published")
    .eq("review_status", "approved")
    .limit(1)
    .single();
  assertDatabaseSuccess(listeningResult.error, "read public listening asset");
  const listeningAssetId = listeningResult.data.id;

  const protectedContentResponse = await fetch(
    `${supabaseUrl}/rest/v1/listening_asset_content?select=transcript_de&asset_id=eq.${listeningAssetId}`,
    { headers: { apikey: anonKey, authorization: `Bearer ${anonKey}` } },
  );
  assert.ok([401, 403, 404].includes(protectedContentResponse.status));

  const ttsKey = `phase7-tts-${stamp}`;
  const firstTts = await post(
    tokenA,
    "/audio/text-to-speech",
    {
      listeningAssetId,
      voice: listeningResult.data.tts_voice,
      idempotencyKey: ttsKey,
    },
    textToSpeechResponseSchema,
  );
  assert.equal(firstTts.cached, false);
  const audioResponse = await fetch(firstTts.signedUrl);
  assert.equal(audioResponse.status, 200);
  assert.equal(audioResponse.headers.get("content-type"), "audio/wav");
  assert.ok((await audioResponse.arrayBuffer()).byteLength > 44);

  const cachedTts = await post(
    tokenA,
    "/audio/text-to-speech",
    {
      listeningAssetId,
      voice: listeningResult.data.tts_voice,
      idempotencyKey: `phase7-tts-${stamp}-cached`,
    },
    textToSpeechResponseSchema,
  );
  assert.equal(cachedTts.cached, true);
  assert.equal(cachedTts.audioAssetId, firstTts.audioAssetId);

  const sessionKey = `phase7-listening-${stamp}`;
  const activity = await learnerA.rpc("record_listening_activity", {
    p_listening_asset_id: listeningAssetId,
    p_session_key: sessionKey,
    p_play_increment: 2,
    p_used_slow_speed: true,
    p_transcript_viewed: false,
  });
  assertDatabaseSuccess(activity.error, "record listening activity");

  const revealed = await post(
    tokenA,
    "/listening/reveal-transcript",
    {
      listeningAssetId,
      sessionKey,
      playIncrement: 0,
      usedSlowSpeed: true,
    },
    revealListeningTranscriptResponseSchema,
  );
  assert.ok(revealed.transcriptDe.length > 10);

  const option = readFirstOptionKey(listeningResult.data.comprehension_options_json);
  const dictationKey = `phase7-dictation-${stamp}`;
  const dictation = await post(
    tokenA,
    "/listening/submit-dictation",
    {
      listeningAssetId,
      sessionKey,
      textDe: revealed.transcriptDe,
      comprehensionAnswer: option,
      playCount: 2,
      usedSlowSpeed: true,
      idempotencyKey: dictationKey,
    },
    submitDictationResponseSchema,
  );
  assert.equal(dictation.score, 100);
  const dictationReplay = await post(
    tokenA,
    "/listening/submit-dictation",
    {
      listeningAssetId,
      sessionKey,
      textDe: revealed.transcriptDe,
      comprehensionAnswer: option,
      playCount: 2,
      usedSlowSpeed: true,
      idempotencyKey: dictationKey,
    },
    submitDictationResponseSchema,
  );
  assert.equal(dictationReplay.idempotentReplay, true);
  assert.equal(dictationReplay.attemptId, dictation.attemptId);

  const promptResult = await anonymous
    .from("speaking_prompts")
    .select("id")
    .eq("level", "B1")
    .eq("status", "published")
    .eq("review_status", "approved")
    .limit(1)
    .single();
  assertDatabaseSuccess(promptResult.error, "read public speaking prompt");
  const speakingPromptId = promptResult.data.id;
  const recordingPath = `${userA.id}/phase7-${stamp}.wav`;
  const upload = await learnerA.storage.from("speaking-audio").upload(recordingPath, createWav(), {
    contentType: "audio/wav",
    upsert: false,
  });
  assertDatabaseSuccess(upload.error, "upload private speaking audio");

  const crossUserSignedUrl = await learnerB.storage
    .from("speaking-audio")
    .createSignedUrl(recordingPath, 60);
  assert.ok(crossUserSignedUrl.error);

  const transcription = await post(
    tokenA,
    "/audio/transcribe",
    {
      speakingPromptId,
      storagePath: recordingPath,
      mimeType: "audio/wav",
      durationMs: 4000,
      idempotencyKey: `phase7-transcription-${stamp}`,
    },
    transcribeResponseSchema,
  );
  assert.equal(transcription.status, "completed");
  assert.equal(transcription.feedback?.disclaimerZhTw.includes("不是精確的發音評分"), true);

  const crossUserSubmissions = await learnerB
    .from("speaking_submissions")
    .select("id")
    .eq("id", transcription.submissionId);
  assertDatabaseSuccess(crossUserSubmissions.error, "query cross-user speaking submissions");
  assert.equal(crossUserSubmissions.data.length, 0);
  const crossUserAudio = await learnerB
    .from("audio_assets")
    .select("id")
    .eq("id", transcription.audioAssetId);
  assertDatabaseSuccess(crossUserAudio.error, "query cross-user audio metadata");
  assert.equal(crossUserAudio.data.length, 0);

  const crossUserDelete = await fetch(
    `${apiBaseUrl}/speaking/submissions/${transcription.submissionId}`,
    { method: "DELETE", headers: { authorization: `Bearer ${tokenB}` } },
  );
  assert.equal(crossUserDelete.status, 404);

  const deleted = await deleteSubmission(tokenA, transcription.submissionId);
  assert.equal(deleted.deleted, true);
  assert.equal(await countRows(admin, "speaking_submissions", profileA), 0);
  assert.equal(await countRows(admin, "audio_assets", profileA, "owner_user_id"), 0);
  const deletedObject = await admin.storage.from("speaking-audio").list(userA.id, {
    search: `phase7-${stamp}.wav`,
  });
  assertDatabaseSuccess(deletedObject.error, "check deleted private recording");
  assert.equal(deletedObject.data.length, 0);

  console.log(
    JSON.stringify(
      {
        anonymousProtectedTranscriptStatus: protectedContentResponse.status,
        generatedAudioBytes: Number(audioResponse.headers.get("content-length") ?? 0),
        ttsCacheHit: cachedTts.cached,
        dictationScore: dictation.score,
        dictationReplay: dictationReplay.idempotentReplay,
        crossUserSignedUrlDenied: Boolean(crossUserSignedUrl.error),
        transcriptionStatus: transcription.status,
        pronunciationDisclaimer: transcription.feedback?.disclaimerZhTw,
        crossUserSubmissionRows: crossUserSubmissions.data.length,
        crossUserAudioRows: crossUserAudio.data.length,
        crossUserDeleteStatus: crossUserDelete.status,
        recordingDeleted: deletedObject.data.length === 0,
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

async function post<T>(
  token: string,
  path: string,
  body: Record<string, unknown>,
  schema: { parse: (value: unknown) => T },
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${path} failed (${response.status}): ${await response.text()}`);
  }
  return schema.parse(await response.json());
}

async function deleteSubmission(token: string, submissionId: string) {
  const response = await fetch(`${apiBaseUrl}/speaking/submissions/${submissionId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Delete failed (${response.status}): ${await response.text()}`);
  }
  return deleteSpeakingSubmissionResponseSchema.parse(await response.json());
}

async function countRows(
  client: SupabaseClient,
  table: string,
  learnerProfileId: string,
  userColumn = "user_id",
): Promise<number> {
  const result = await client
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(userColumn, learnerProfileId);
  assertDatabaseSuccess(result.error, `count ${table}`);
  return result.count ?? 0;
}

function readFirstOptionKey(value: unknown): string {
  if (!Array.isArray(value) || typeof value[0] !== "object" || value[0] === null) {
    throw new Error("Listening options are missing.");
  }
  const key = (value[0] as { key?: unknown }).key;
  if (typeof key !== "string") {
    throw new Error("Listening option key is missing.");
  }
  return key;
}

function createWav(): Uint8Array {
  const sampleRate = 8000;
  const sampleCount = sampleRate;
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return new Uint8Array(buffer);
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
