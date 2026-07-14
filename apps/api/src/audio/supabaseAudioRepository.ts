import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  speechComparisonChangeSchema,
  speakingFeedbackSchema,
  speechWordTimingSchema,
  type RevealListeningTranscriptRequest,
  type TranscribeRequest,
} from "@deutschtrainer/validation";
import type { AudioVoice, CefrLevel, ListeningKind } from "@deutschtrainer/shared-types";
import { ApiError } from "../errors";
import type { AuthenticatedLearner } from "../evaluation/types";
import type {
  AudioRepository,
  AudioUsageLogInput,
  GeneratedAudioInput,
  ListeningResultInput,
  PreparedSpeakingSubmission,
  ProtectedListeningAsset,
  ProtectedSpeakingPrompt,
  StoredGeneratedAudio,
  StoredListeningAttempt,
  StoredSpeakingSubmission,
} from "./types";

export class SupabaseAudioRepository implements AudioRepository {
  private readonly client: SupabaseClient;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async authenticate(accessToken: string): Promise<AuthenticatedLearner | undefined> {
    const userResult = await this.client.auth.getUser(accessToken);
    if (userResult.error || !userResult.data.user) {
      return undefined;
    }
    const profileResult = await this.client
      .from("profiles")
      .select("id, timezone")
      .eq("auth_user_id", userResult.data.user.id)
      .is("deleted_at", null)
      .maybeSingle();
    assertDatabaseResult(profileResult.error, "無法驗證學習者資料。");
    if (!profileResult.data) {
      return undefined;
    }
    return {
      authUserId: userResult.data.user.id,
      profileId: profileResult.data.id,
      timezone: profileResult.data.timezone,
    };
  }

  async getListeningAsset(assetId: string): Promise<ProtectedListeningAsset | undefined> {
    const assetResult = await this.client
      .from("listening_assets")
      .select("id, lesson_id, level, kind, version")
      .eq("id", assetId)
      .eq("status", "published")
      .eq("review_status", "approved")
      .is("deleted_at", null)
      .maybeSingle();
    assertDatabaseResult(assetResult.error, "無法讀取聽力素材。");
    if (!assetResult.data) {
      return undefined;
    }
    const contentResult = await this.client
      .from("listening_asset_content")
      .select("transcript_de, comprehension_correct_option, tts_instructions")
      .eq("asset_id", assetId)
      .maybeSingle();
    assertDatabaseResult(contentResult.error, "無法讀取受保護的聽力內容。");
    if (!contentResult.data) {
      return undefined;
    }
    return {
      id: assetResult.data.id,
      lessonId: assetResult.data.lesson_id,
      level: assetResult.data.level as CefrLevel,
      kind: assetResult.data.kind as ListeningKind,
      version: assetResult.data.version,
      transcriptDe: contentResult.data.transcript_de,
      comprehensionCorrectOption: contentResult.data.comprehension_correct_option,
      ttsInstructions: contentResult.data.tts_instructions,
    };
  }

  async getSpeakingPrompt(promptId: string): Promise<ProtectedSpeakingPrompt | undefined> {
    const result = await this.client
      .from("speaking_prompts")
      .select("id, level, target_de, maximum_seconds, version")
      .eq("id", promptId)
      .eq("status", "published")
      .eq("review_status", "approved")
      .is("deleted_at", null)
      .maybeSingle();
    assertDatabaseResult(result.error, "無法讀取口說題目。");
    return result.data
      ? {
          id: result.data.id,
          level: result.data.level as CefrLevel,
          targetDe: result.data.target_de,
          maximumSeconds: result.data.maximum_seconds,
          version: result.data.version,
        }
      : undefined;
  }

  async findGeneratedAudio(cacheKey: string): Promise<StoredGeneratedAudio | undefined> {
    const result = await this.client
      .from("audio_assets")
      .select("id, storage_path, content_type, voice, model")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    assertDatabaseResult(result.error, "無法檢查語音快取。");
    return result.data ? mapGeneratedAudio(result.data) : undefined;
  }

  async storeGeneratedAudio(input: GeneratedAudioInput): Promise<StoredGeneratedAudio> {
    const extension = input.contentType === "audio/wav" ? "wav" : "mp3";
    const storagePath = `${input.asset.id}/${input.cacheKey}.${extension}`;
    const upload = await this.client.storage
      .from("listening-audio")
      .upload(storagePath, input.bytes, {
        contentType: input.contentType,
        upsert: false,
      });
    if (upload.error && !isDuplicateError(upload.error)) {
      throw new ApiError("DATABASE_ERROR", `無法保存合成語音。 ${upload.error.message}`, 500, true);
    }

    const insert = await this.client
      .from("audio_assets")
      .insert({
        owner_user_id: null,
        listening_asset_id: input.asset.id,
        storage_bucket: "listening-audio",
        storage_path: storagePath,
        source_type: "generated",
        license: "openai_generated_for_deutschtrainer",
        content_type: input.contentType,
        duration_ms: 0,
        voice: input.voice,
        model: input.model,
        cache_key: input.cacheKey,
      })
      .select("id, storage_path, content_type, voice, model")
      .single();
    if (insert.error && isDuplicateError(insert.error)) {
      const existing = await this.findGeneratedAudio(input.cacheKey);
      if (existing) {
        return existing;
      }
    }
    assertDatabaseResult(insert.error, "無法保存合成語音中繼資料。");
    if (!insert.data) {
      throw new ApiError("DATABASE_ERROR", "合成語音中繼資料未回傳。", 500, true);
    }
    return mapGeneratedAudio(insert.data);
  }

  async createSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string> {
    const result = await this.client.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (result.error || !result.data?.signedUrl) {
      throw new ApiError(
        "DATABASE_ERROR",
        `無法建立音訊存取連結。 ${result.error?.message ?? ""}`.trim(),
        500,
        true,
      );
    }
    return result.data.signedUrl;
  }

  async countRecentLogicalRequests(
    learnerId: string,
    feature: AudioUsageLogInput["feature"],
    since: string,
  ): Promise<number> {
    const result = await this.client
      .from("ai_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", learnerId)
      .eq("feature", feature)
      .eq("logical_request", true)
      .gte("created_at", since);
    assertDatabaseResult(result.error, "無法檢查音訊功能使用額度。");
    return result.count ?? 0;
  }

  async recordUsage(input: AudioUsageLogInput): Promise<void> {
    const result = await this.client.from("ai_usage_logs").insert({
      user_id: input.learnerId,
      request_id: input.requestId,
      idempotency_key: input.idempotencyKey,
      feature: input.feature,
      model: input.model,
      provider_request_id: input.providerRequestId ?? null,
      provider_attempt: input.cached ? 0 : 1,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost: 0,
      latency_ms: input.latencyMs,
      success: input.success,
      cached: input.cached,
      logical_request: input.logicalRequest,
      error_code: input.errorCode ?? null,
    });
    assertDatabaseResult(result.error, "無法保存音訊 AI 使用紀錄。");
  }

  async recordListeningActivity(
    learnerId: string,
    request: RevealListeningTranscriptRequest,
  ): Promise<string> {
    const existingResult = await this.client
      .from("listening_attempts")
      .select("id, listening_asset_id, play_count, used_slow_speed")
      .eq("user_id", learnerId)
      .eq("session_key", request.sessionKey)
      .maybeSingle();
    assertDatabaseResult(existingResult.error, "無法讀取聽力練習進度。");
    if (existingResult.data) {
      if (existingResult.data.listening_asset_id !== request.listeningAssetId) {
        throw new ApiError("VALIDATION_ERROR", "聽力練習識別碼與素材不一致。", 409, false);
      }
      const update = await this.client
        .from("listening_attempts")
        .update({
          play_count: Math.min(1000, existingResult.data.play_count + request.playIncrement),
          used_slow_speed: existingResult.data.used_slow_speed || request.usedSlowSpeed,
          transcript_viewed: true,
        })
        .eq("id", existingResult.data.id);
      assertDatabaseResult(update.error, "無法更新聽力練習進度。");
      return existingResult.data.id;
    }
    const insert = await this.client
      .from("listening_attempts")
      .insert({
        user_id: learnerId,
        listening_asset_id: request.listeningAssetId,
        session_key: request.sessionKey,
        play_count: request.playIncrement,
        used_slow_speed: request.usedSlowSpeed,
        transcript_viewed: true,
      })
      .select("id")
      .single();
    assertDatabaseResult(insert.error, "無法建立聽力練習進度。");
    if (!insert.data) {
      throw new ApiError("DATABASE_ERROR", "聽力練習進度未回傳。", 500, true);
    }
    return insert.data.id;
  }

  async findListeningAttemptByIdempotency(
    learnerId: string,
    idempotencyKey: string,
  ): Promise<StoredListeningAttempt | undefined> {
    const result = await this.client
      .from("listening_attempts")
      .select("id, listening_asset_id, session_key, dictation_text, comprehension_answer")
      .eq("user_id", learnerId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    assertDatabaseResult(result.error, "無法檢查重複的聽寫提交。");
    if (!result.data?.dictation_text || !result.data.comprehension_answer) {
      return undefined;
    }
    return {
      id: result.data.id,
      listeningAssetId: result.data.listening_asset_id,
      sessionKey: result.data.session_key,
      dictationText: result.data.dictation_text,
      comprehensionAnswer: result.data.comprehension_answer,
    };
  }

  async recordListeningResult(input: ListeningResultInput): Promise<{
    attemptId: string;
    idempotentReplay: boolean;
  }> {
    const result = await this.client.rpc("record_listening_result", {
      p_user_id: input.learnerId,
      p_listening_asset_id: input.request.listeningAssetId,
      p_session_key: input.request.sessionKey,
      p_dictation_text: input.request.textDe,
      p_dictation_score: input.score,
      p_comprehension_answer: input.request.comprehensionAnswer,
      p_comprehension_correct: input.comprehensionCorrect,
      p_difficult_words: input.difficultWords,
      p_play_count: input.request.playCount,
      p_used_slow_speed: input.request.usedSlowSpeed,
      p_idempotency_key: input.request.idempotencyKey,
    });
    assertDatabaseResult(result.error, "無法保存聽寫結果。");
    const record = asObject(result.data);
    const attemptId = readString(record, "attemptId");
    if (!attemptId) {
      throw new ApiError("DATABASE_ERROR", "聽寫結果紀錄不完整。", 500, true);
    }
    return {
      attemptId,
      idempotentReplay: readBoolean(record, "idempotentReplay"),
    };
  }

  async findSpeakingSubmissionByIdempotency(
    learnerId: string,
    idempotencyKey: string,
  ): Promise<StoredSpeakingSubmission | undefined> {
    const result = await this.client
      .from("speaking_submissions")
      .select(
        "id, audio_asset_id, speaking_prompt_id, status, transcript_de, word_timings_json, comparison_json, feedback_json, model, error_code",
      )
      .eq("user_id", learnerId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    assertDatabaseResult(result.error, "無法檢查重複的錄音轉錄要求。");
    if (!result.data) {
      return undefined;
    }
    const audioResult = await this.client
      .from("audio_assets")
      .select("storage_path")
      .eq("id", result.data.audio_asset_id)
      .single();
    assertDatabaseResult(audioResult.error, "無法讀取錄音中繼資料。");
    if (!audioResult.data) {
      throw new ApiError("DATABASE_ERROR", "錄音中繼資料不存在。", 500, true);
    }
    const feedback = result.data.feedback_json
      ? speakingFeedbackSchema.parse(result.data.feedback_json)
      : undefined;
    return {
      id: result.data.id,
      audioAssetId: result.data.audio_asset_id,
      speakingPromptId: result.data.speaking_prompt_id,
      storagePath: audioResult.data.storage_path,
      status: result.data.status,
      ...(result.data.transcript_de ? { transcriptDe: result.data.transcript_de } : {}),
      wordTimings: speechWordTimingSchema.array().parse(result.data.word_timings_json),
      comparison: speechComparisonChangeSchema.array().parse(result.data.comparison_json),
      ...(feedback ? { feedback } : {}),
      ...(result.data.model ? { model: result.data.model } : {}),
      ...(result.data.error_code ? { errorCode: result.data.error_code } : {}),
    };
  }

  async prepareSpeakingSubmission(
    learner: AuthenticatedLearner,
    request: TranscribeRequest,
  ): Promise<PreparedSpeakingSubmission> {
    if (!request.storagePath.startsWith(`${learner.authUserId}/`)) {
      throw new ApiError("FORBIDDEN", "只能轉錄自己的錄音。", 403, false);
    }
    const result = await this.client.rpc("prepare_speaking_submission", {
      p_user_id: learner.profileId,
      p_speaking_prompt_id: request.speakingPromptId,
      p_storage_path: request.storagePath,
      p_mime_type: request.mimeType,
      p_duration_ms: request.durationMs,
      p_idempotency_key: request.idempotencyKey,
    });
    assertDatabaseResult(result.error, "無法建立口說提交紀錄。");
    const record = asObject(result.data);
    const submissionId = readString(record, "submissionId");
    const audioAssetId = readString(record, "audioAssetId");
    if (!submissionId || !audioAssetId) {
      throw new ApiError("DATABASE_ERROR", "口說提交紀錄不完整。", 500, true);
    }
    return {
      submissionId,
      audioAssetId,
      created: readBoolean(record, "created"),
    };
  }

  async downloadSpeakingAudio(storagePath: string): Promise<Uint8Array> {
    const result = await this.client.storage.from("speaking-audio").download(storagePath);
    if (result.error || !result.data) {
      throw new ApiError(
        "DATABASE_ERROR",
        `無法讀取錄音。 ${result.error?.message ?? ""}`.trim(),
        500,
        true,
      );
    }
    return new Uint8Array(await result.data.arrayBuffer());
  }

  async recordSpeakingResult(input: {
    learnerId: string;
    submissionId: string;
    transcriptDe: string;
    wordTimings: StoredSpeakingSubmission["wordTimings"];
    comparison: StoredSpeakingSubmission["comparison"];
    feedback: NonNullable<StoredSpeakingSubmission["feedback"]>;
    wordsPerMinute: number;
    model: string;
  }): Promise<void> {
    const result = await this.client.rpc("record_speaking_result", {
      p_user_id: input.learnerId,
      p_submission_id: input.submissionId,
      p_transcript_de: input.transcriptDe,
      p_word_timings_json: input.wordTimings,
      p_comparison_json: input.comparison,
      p_feedback_json: input.feedback,
      p_words_per_minute: input.wordsPerMinute,
      p_model: input.model,
    });
    assertDatabaseResult(result.error, "無法保存口說回饋。");
  }

  async markSpeakingFailed(
    learnerId: string,
    submissionId: string,
    errorCode: string,
  ): Promise<void> {
    const result = await this.client.rpc("mark_speaking_transcription_failed", {
      p_user_id: learnerId,
      p_submission_id: submissionId,
      p_error_code: errorCode,
    });
    assertDatabaseResult(result.error, "無法更新錄音轉錄狀態。");
  }

  async getOwnedSpeakingSubmission(
    learnerId: string,
    submissionId: string,
  ): Promise<{ audioAssetId: string; storagePath: string } | undefined> {
    const submission = await this.client
      .from("speaking_submissions")
      .select("audio_asset_id")
      .eq("id", submissionId)
      .eq("user_id", learnerId)
      .maybeSingle();
    assertDatabaseResult(submission.error, "無法讀取口說提交紀錄。");
    if (!submission.data) {
      return undefined;
    }
    const audio = await this.client
      .from("audio_assets")
      .select("storage_path")
      .eq("id", submission.data.audio_asset_id)
      .eq("owner_user_id", learnerId)
      .maybeSingle();
    assertDatabaseResult(audio.error, "無法讀取錄音中繼資料。");
    return audio.data
      ? { audioAssetId: submission.data.audio_asset_id, storagePath: audio.data.storage_path }
      : undefined;
  }

  async deleteSpeakingSubmission(audioAssetId: string, storagePath: string): Promise<void> {
    const storageResult = await this.client.storage.from("speaking-audio").remove([storagePath]);
    if (storageResult.error) {
      throw new ApiError(
        "DATABASE_ERROR",
        `無法刪除私人錄音。 ${storageResult.error.message}`,
        500,
        true,
      );
    }
    const databaseResult = await this.client.from("audio_assets").delete().eq("id", audioAssetId);
    assertDatabaseResult(databaseResult.error, "無法刪除口說提交紀錄。");
  }
}

function mapGeneratedAudio(row: {
  id: string;
  storage_path: string;
  content_type: string;
  voice: string | null;
  model: string | null;
}): StoredGeneratedAudio {
  if (
    (row.content_type !== "audio/wav" && row.content_type !== "audio/mpeg") ||
    (row.voice !== "marin" && row.voice !== "cedar") ||
    !row.model
  ) {
    throw new ApiError("DATABASE_ERROR", "合成語音中繼資料格式不完整。", 500, true);
  }
  return {
    id: row.id,
    storagePath: row.storage_path,
    contentType: row.content_type,
    voice: row.voice as AudioVoice,
    model: row.model,
  };
}

function assertDatabaseResult(
  error: { code?: string; message: string } | null,
  message: string,
): void {
  if (error) {
    throw new ApiError("DATABASE_ERROR", `${message} ${error.message}`, 500, true);
  }
}

function isDuplicateError(error: { message: string; statusCode?: string | undefined }): boolean {
  return (
    error.statusCode === "409" || /duplicate|already exists|resource exists/i.test(error.message)
  );
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  return typeof value === "boolean" ? value : false;
}
