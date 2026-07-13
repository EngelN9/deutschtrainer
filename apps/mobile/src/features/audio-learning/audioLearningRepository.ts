import { File } from "expo-file-system";
import { Platform } from "react-native";
import {
  apiErrorResponseSchema,
  audioLearningWorkspaceSchema,
  deleteSpeakingSubmissionResponseSchema,
  revealListeningTranscriptResponseSchema,
  submitDictationResponseSchema,
  textToSpeechResponseSchema,
  transcribeResponseSchema,
  type AudioLearningWorkspace,
  type DeleteSpeakingSubmissionResponse,
  type ListeningActivityRequest,
  type RevealListeningTranscriptRequest,
  type RevealListeningTranscriptResponse,
  type SubmitDictationRequest,
  type SubmitDictationResponse,
  type TextToSpeechRequest,
  type TextToSpeechResponse,
  type TranscribeRequest,
  type TranscribeResponse,
} from "@deutschtrainer/validation";
import type { Database } from "../../lib/database.types";
import { mobileEnv } from "../../lib/env";
import { supabase } from "../../lib/supabase";

type ListeningAssetRow = Database["public"]["Tables"]["listening_assets"]["Row"];
type ListeningAttemptRow = Database["public"]["Tables"]["listening_attempts"]["Row"];
type SpeakingPromptRow = Database["public"]["Tables"]["speaking_prompts"]["Row"];
type SpeakingSubmissionRow = Database["public"]["Tables"]["speaking_submissions"]["Row"];
type AudioAssetRow = Database["public"]["Tables"]["audio_assets"]["Row"];

export async function getAudioLearningWorkspace(): Promise<AudioLearningWorkspace> {
  await requireSession();
  const [listeningResult, attemptsResult, promptsResult, submissionsResult, audioResult] =
    await Promise.all([
      supabase
        .from("listening_assets")
        .select("*")
        .eq("status", "published")
        .eq("review_status", "approved")
        .is("deleted_at", null)
        .order("level"),
      supabase.from("listening_attempts").select("*").order("updated_at", { ascending: false }),
      supabase
        .from("speaking_prompts")
        .select("*")
        .eq("status", "published")
        .eq("review_status", "approved")
        .is("deleted_at", null)
        .order("level"),
      supabase.from("speaking_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("audio_assets").select("*").order("created_at", { ascending: false }),
    ]);
  const firstError = [
    listeningResult.error,
    attemptsResult.error,
    promptsResult.error,
    submissionsResult.error,
    audioResult.error,
  ].find(Boolean);
  if (firstError) {
    throw new Error(`無法載入聽說訓練資料：${firstError.message}`);
  }
  const candidate = {
    listeningAssets: (listeningResult.data ?? []).map(mapListeningAsset),
    listeningAttempts: (attemptsResult.data ?? []).map(mapListeningAttempt),
    speakingPrompts: (promptsResult.data ?? []).map(mapSpeakingPrompt),
    speakingSubmissions: (submissionsResult.data ?? []).map(mapSpeakingSubmission),
    audioAssets: (audioResult.data ?? []).map(mapAudioAsset),
  };
  const parsed = audioLearningWorkspaceSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error("聽說訓練資料格式不完整，請稍後重新整理。");
  }
  return parsed.data;
}

export async function requestListeningAudio(
  request: TextToSpeechRequest,
): Promise<TextToSpeechResponse> {
  return postApi("/audio/text-to-speech", request, textToSpeechResponseSchema);
}

export async function revealListeningTranscript(
  request: RevealListeningTranscriptRequest,
): Promise<RevealListeningTranscriptResponse> {
  return postApi("/listening/reveal-transcript", request, revealListeningTranscriptResponseSchema);
}

export async function submitListeningDictation(
  request: SubmitDictationRequest,
): Promise<SubmitDictationResponse> {
  return postApi("/listening/submit-dictation", request, submitDictationResponseSchema);
}

export async function recordListeningActivity(request: ListeningActivityRequest): Promise<string> {
  const result = await supabase.rpc("record_listening_activity", {
    p_listening_asset_id: request.listeningAssetId,
    p_session_key: request.sessionKey,
    p_play_increment: request.playIncrement,
    p_used_slow_speed: request.usedSlowSpeed,
    p_transcript_viewed: request.transcriptViewed,
  });
  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "無法保存聽力播放進度。");
  }
  return result.data;
}

export async function uploadSpeakingRecording(input: {
  uri: string;
  mimeType: TranscribeRequest["mimeType"];
  idempotencyKey: string;
}): Promise<string> {
  const session = await requireSession();
  const extension = extensionForMimeType(input.mimeType);
  const storagePath = `${session.user.id}/${safeFileName(input.idempotencyKey)}.${extension}`;
  const bytes = await recordingArrayBuffer(input.uri);
  if (bytes.byteLength === 0 || bytes.byteLength > 10 * 1024 * 1024) {
    throw new Error("錄音檔必須介於 1 byte 與 10 MB 之間。");
  }
  const result = await supabase.storage.from("speaking-audio").upload(storagePath, bytes, {
    contentType: input.mimeType,
    upsert: false,
  });
  if (result.error && !/already exists|duplicate|resource exists/i.test(result.error.message)) {
    throw new Error(`無法上傳錄音：${result.error.message}`);
  }
  return storagePath;
}

export async function transcribeSpeakingRecording(
  request: TranscribeRequest,
): Promise<TranscribeResponse> {
  return postApi("/audio/transcribe", request, transcribeResponseSchema);
}

export async function deleteSpeakingSubmission(
  submissionId: string,
): Promise<DeleteSpeakingSubmissionResponse> {
  const session = await requireSession();
  let response: Response;
  try {
    response = await fetch(
      `${mobileEnv.apiBaseUrl.replace(/\/$/, "")}/speaking/submissions/${submissionId}`,
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${session.access_token}` },
      },
    );
  } catch {
    throw new Error("無法連線至錄音刪除服務，請檢查網路後重試。");
  }
  return parseApiResponse(response, deleteSpeakingSubmissionResponseSchema, "無法刪除錄音。");
}

export async function deleteUploadedRecording(storagePath: string): Promise<void> {
  const result = await supabase.storage.from("speaking-audio").remove([storagePath]);
  if (result.error) {
    throw new Error(`無法清除未提交的錄音：${result.error.message}`);
  }
}

async function postApi<T>(
  path: string,
  body: unknown,
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
): Promise<T> {
  const session = await requireSession();
  let response: Response;
  try {
    response = await fetch(`${mobileEnv.apiBaseUrl.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("無法連線至聽說訓練服務，請檢查網路後重試。");
  }
  return parseApiResponse(response, schema, "聽說訓練服務回傳格式不完整。");
}

async function parseApiResponse<T>(
  response: Response,
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
  fallback: string,
): Promise<T> {
  const payload = await readJson(response);
  if (!response.ok) {
    const errorResult = apiErrorResponseSchema.safeParse(payload);
    throw new Error(errorResult.success ? errorResult.data.error.message : fallback);
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(fallback);
  }
  return parsed.data;
}

async function requireSession() {
  const result = await supabase.auth.getSession();
  if (result.error || !result.data.session) {
    throw new Error("登入狀態已失效，請重新登入。");
  }
  return result.data.session;
}

async function recordingArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error("無法讀取瀏覽器錄音。");
    }
    return response.arrayBuffer();
  }
  return new File(uri).arrayBuffer();
}

function mapListeningAsset(row: ListeningAssetRow) {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    level: row.level,
    kind: row.kind,
    titleZhTw: row.title_zh_tw,
    descriptionZhTw: row.description_zh_tw,
    estimatedSeconds: row.estimated_seconds,
    keywordHints: readStringArray(row.keyword_hints_json),
    comprehensionQuestionZhTw: row.comprehension_question_zh_tw,
    comprehensionOptions: readOptions(row.comprehension_options_json),
    skillIds: row.skill_ids,
    ttsVoice: row.tts_voice,
    version: row.version,
  };
}

function mapListeningAttempt(row: ListeningAttemptRow) {
  return {
    id: row.id,
    userId: row.user_id,
    listeningAssetId: row.listening_asset_id,
    sessionKey: row.session_key,
    status: row.status,
    playCount: row.play_count,
    usedSlowSpeed: row.used_slow_speed,
    transcriptViewed: row.transcript_viewed,
    ...(row.dictation_text ? { dictationText: row.dictation_text } : {}),
    ...(row.dictation_score !== null ? { dictationScore: row.dictation_score } : {}),
    ...(row.comprehension_answer ? { comprehensionAnswer: row.comprehension_answer } : {}),
    ...(row.comprehension_correct !== null
      ? { comprehensionCorrect: row.comprehension_correct }
      : {}),
    difficultWords: row.difficult_words,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSpeakingPrompt(row: SpeakingPromptRow) {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    level: row.level,
    titleZhTw: row.title_zh_tw,
    instructionZhTw: row.instruction_zh_tw,
    targetDe: row.target_de,
    translationZhTw: row.translation_zh_tw,
    skillIds: row.skill_ids,
    maximumSeconds: row.maximum_seconds,
    version: row.version,
  };
}

function mapSpeakingSubmission(row: SpeakingSubmissionRow) {
  return {
    id: row.id,
    userId: row.user_id,
    speakingPromptId: row.speaking_prompt_id,
    audioAssetId: row.audio_asset_id,
    status: row.status,
    ...(row.transcript_de ? { transcriptDe: row.transcript_de } : {}),
    wordTimings: row.word_timings_json,
    comparison: row.comparison_json,
    ...(row.feedback_json ? { feedback: row.feedback_json } : {}),
    ...(row.words_per_minute !== null ? { wordsPerMinute: Number(row.words_per_minute) } : {}),
    ...(row.model ? { model: row.model } : {}),
    ...(row.error_code ? { errorCode: row.error_code } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAudioAsset(row: AudioAssetRow) {
  return {
    id: row.id,
    ...(row.owner_user_id ? { ownerUserId: row.owner_user_id } : {}),
    ...(row.listening_asset_id ? { listeningAssetId: row.listening_asset_id } : {}),
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    sourceType: row.source_type,
    license: row.license,
    contentType: row.content_type,
    durationMs: row.duration_ms,
    ...(row.voice ? { voice: row.voice } : {}),
    ...(row.model ? { model: row.model } : {}),
    createdAt: row.created_at,
  };
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : [];
}

function readOptions(value: unknown): Array<{ key: string; textZhTw: string }> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return [];
    }
    const record = entry as Record<string, unknown>;
    return typeof record.key === "string" && typeof record.textZhTw === "string"
      ? [{ key: record.key, textZhTw: record.textZhTw }]
      : [];
  });
}

function extensionForMimeType(mimeType: TranscribeRequest["mimeType"]): string {
  if (mimeType === "audio/webm") return "webm";
  if (mimeType === "audio/wav") return "wav";
  if (mimeType === "audio/mpeg") return "mp3";
  return "m4a";
}

function safeFileName(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 180);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}
