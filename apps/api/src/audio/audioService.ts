import { createHash, randomUUID } from "node:crypto";
import { diffArrays } from "diff";
import type {
  SpeechComparisonChange,
  SpeakingFeedback,
  SpeechWordTiming,
} from "@deutschtrainer/shared-types";
import type {
  AudioLearningWorkspaceResponse,
  DeleteSpeakingSubmissionResponse,
  ListeningActivityRequest,
  ListeningActivityResponse,
  RevealListeningTranscriptRequest,
  RevealListeningTranscriptResponse,
  SubmitDictationRequest,
  SubmitDictationResponse,
  TextToSpeechRequest,
  TextToSpeechResponse,
  TranscribeRequest,
  TranscribeResponse,
} from "@deutschtrainer/validation";
import { ApiError } from "../errors";
import { PrivateRequestRateLimiter } from "../privateRequestRateLimiter";
import { AudioProviderError, type AudioProviderErrorCode } from "./openAiAudioProvider";
import type {
  AudioLearningServiceContract,
  AudioProvider,
  AudioRepository,
  ProtectedSpeakingPrompt,
  StoredSpeakingSubmission,
} from "./types";

export interface AudioLearningServiceOptions {
  repository: AudioRepository;
  provider: AudioProvider;
  dailyTtsLimit: number;
  dailyTranscriptionLimit: number;
  privateRequestsPerMinute?: number;
  rateLimiter?: PrivateRequestRateLimiter;
  signedUrlSeconds?: number;
  now?: () => Date;
  requestId?: () => string;
}

export class AudioLearningService implements AudioLearningServiceContract {
  private readonly now: () => Date;
  private readonly requestId: () => string;
  private readonly signedUrlSeconds: number;
  private readonly rateLimiter: PrivateRequestRateLimiter;

  constructor(private readonly options: AudioLearningServiceOptions) {
    this.now = options.now ?? (() => new Date());
    this.requestId = options.requestId ?? randomUUID;
    this.signedUrlSeconds = options.signedUrlSeconds ?? 900;
    this.rateLimiter =
      options.rateLimiter ??
      new PrivateRequestRateLimiter(options.privateRequestsPerMinute ?? 60, this.now);
  }

  async getWorkspace(accessToken: string): Promise<AudioLearningWorkspaceResponse> {
    const learner = await this.requireLearner(accessToken);
    return this.options.repository.getWorkspace(learner.profileId);
  }

  async recordActivity(
    accessToken: string,
    request: ListeningActivityRequest,
  ): Promise<ListeningActivityResponse> {
    const requestId = this.requestId();
    const learner = await this.requireLearner(accessToken);
    const asset = await this.options.repository.getListeningAsset(request.listeningAssetId);
    if (!asset) {
      throw new ApiError("NOT_FOUND", "找不到可使用的聽力素材。", 404, false);
    }
    const attemptId = await this.options.repository.recordListeningActivity(
      learner.profileId,
      request,
    );
    return { requestId, attemptId };
  }

  async synthesize(
    accessToken: string,
    request: TextToSpeechRequest,
  ): Promise<TextToSpeechResponse> {
    const requestId = this.requestId();
    const learner = await this.requireLearner(accessToken);
    const asset = await this.options.repository.getListeningAsset(request.listeningAssetId);
    if (!asset) {
      throw new ApiError("NOT_FOUND", "找不到可使用的聽力素材。", 404, false);
    }
    const cacheKey = createHash("sha256")
      .update(
        `${asset.id}:${asset.version}:${request.voice}:${this.options.provider.ttsModel}:${asset.transcriptDe}`,
      )
      .digest("hex");
    const cached = await this.options.repository.findGeneratedAudio(cacheKey);
    if (cached) {
      const signedUrl = await this.options.repository.createSignedUrl(
        "listening-audio",
        cached.storagePath,
        this.signedUrlSeconds,
      );
      await this.options.repository.recordUsage({
        learnerId: learner.profileId,
        requestId,
        idempotencyKey: request.idempotencyKey,
        feature: "text_to_speech",
        model: cached.model,
        latencyMs: 0,
        success: true,
        cached: true,
        logicalRequest: false,
      });
      return this.createTtsResponse(requestId, cached, signedUrl, true);
    }

    try {
      await this.enforceDailyLimit(
        learner.profileId,
        "text_to_speech",
        this.options.dailyTtsLimit,
        "今日語音合成額度已用完，仍可使用先前產生的音檔。",
      );
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== "RATE_LIMITED") {
        throw error;
      }
      await this.options.repository.recordUsage({
        learnerId: learner.profileId,
        requestId,
        idempotencyKey: request.idempotencyKey,
        feature: "text_to_speech",
        model: this.options.provider.ttsModel,
        latencyMs: 0,
        success: false,
        cached: false,
        logicalRequest: true,
        errorCode: "RATE_LIMITED",
      });
      throw error;
    }
    if (!this.options.provider.configured) {
      await this.logUnavailable(
        learner.profileId,
        requestId,
        request.idempotencyKey,
        "text_to_speech",
        this.options.provider.ttsModel,
      );
      throw new ApiError("AI_NOT_CONFIGURED", "伺服器尚未設定語音合成服務。", 503, true);
    }

    try {
      const generated = await this.options.provider.synthesize({
        textDe: asset.transcriptDe,
        voice: request.voice,
        instructions: asset.ttsInstructions,
      });
      const stored = await this.options.repository.storeGeneratedAudio({
        asset,
        bytes: generated.bytes,
        cacheKey,
        contentType: generated.contentType,
        voice: request.voice,
        model: generated.model,
      });
      await this.options.repository.recordUsage({
        learnerId: learner.profileId,
        requestId,
        idempotencyKey: request.idempotencyKey,
        feature: "text_to_speech",
        model: generated.model,
        ...(generated.providerRequestId ? { providerRequestId: generated.providerRequestId } : {}),
        latencyMs: generated.latencyMs,
        success: true,
        cached: false,
        logicalRequest: true,
      });
      const signedUrl = await this.options.repository.createSignedUrl(
        "listening-audio",
        stored.storagePath,
        this.signedUrlSeconds,
      );
      return this.createTtsResponse(requestId, stored, signedUrl, false);
    } catch (error) {
      await this.recordProviderFailure(
        learner.profileId,
        requestId,
        request.idempotencyKey,
        "text_to_speech",
        this.options.provider.ttsModel,
        error,
      );
      throw toAudioApiError(error, "語音合成暫時無法使用。");
    }
  }

  async revealTranscript(
    accessToken: string,
    request: RevealListeningTranscriptRequest,
  ): Promise<RevealListeningTranscriptResponse> {
    const requestId = this.requestId();
    const learner = await this.requireLearner(accessToken);
    const asset = await this.options.repository.getListeningAsset(request.listeningAssetId);
    if (!asset) {
      throw new ApiError("NOT_FOUND", "找不到可使用的聽力素材。", 404, false);
    }
    const attemptId = await this.options.repository.recordListeningActivity(learner.profileId, {
      ...request,
      transcriptViewed: true,
    });
    return { requestId, attemptId, transcriptDe: asset.transcriptDe };
  }

  async submitDictation(
    accessToken: string,
    request: SubmitDictationRequest,
  ): Promise<SubmitDictationResponse> {
    const requestId = this.requestId();
    const learner = await this.requireLearner(accessToken);
    const asset = await this.options.repository.getListeningAsset(request.listeningAssetId);
    if (!asset) {
      throw new ApiError("NOT_FOUND", "找不到可使用的聽力素材。", 404, false);
    }
    const existing = await this.options.repository.findListeningAttemptByIdempotency(
      learner.profileId,
      request.idempotencyKey,
    );
    if (
      existing &&
      (existing.listeningAssetId !== request.listeningAssetId ||
        existing.sessionKey !== request.sessionKey ||
        existing.dictationText !== request.textDe ||
        existing.comprehensionAnswer !== request.comprehensionAnswer)
    ) {
      throw new ApiError("VALIDATION_ERROR", "重複提交識別碼已用於不同的聽寫內容。", 409, false);
    }
    const scored = scoreWordComparison(
      asset.transcriptDe,
      existing?.dictationText ?? request.textDe,
    );
    const comprehensionAnswer = existing?.comprehensionAnswer ?? request.comprehensionAnswer;
    const comprehensionCorrect =
      normalizeOption(comprehensionAnswer) === normalizeOption(asset.comprehensionCorrectOption);
    const recorded = existing
      ? { attemptId: existing.id, idempotentReplay: true }
      : await this.options.repository.recordListeningResult({
          learnerId: learner.profileId,
          request,
          score: scored.score,
          comprehensionCorrect,
          difficultWords: scored.difficultWords,
        });
    return {
      requestId,
      attemptId: recorded.attemptId,
      transcriptDe: asset.transcriptDe,
      score: scored.score,
      comparison: scored.comparison,
      difficultWords: scored.difficultWords,
      comprehensionCorrect,
      idempotentReplay: recorded.idempotentReplay,
    };
  }

  async transcribe(accessToken: string, request: TranscribeRequest): Promise<TranscribeResponse> {
    const requestId = this.requestId();
    const learner = await this.requireLearner(accessToken);
    const prompt = await this.options.repository.getSpeakingPrompt(request.speakingPromptId);
    if (!prompt) {
      throw new ApiError("NOT_FOUND", "找不到可使用的口說題目。", 404, false);
    }
    if (request.durationMs > prompt.maximumSeconds * 1000) {
      throw new ApiError("VALIDATION_ERROR", "錄音時間超過此題目上限。", 400, false);
    }

    const existing = await this.options.repository.findSpeakingSubmissionByIdempotency(
      learner.profileId,
      request.idempotencyKey,
    );
    if (existing && existing.speakingPromptId !== request.speakingPromptId) {
      throw new ApiError("VALIDATION_ERROR", "重複提交識別碼已用於其他口說題目。", 409, false);
    }
    if (existing && existing.storagePath !== request.storagePath) {
      throw new ApiError("VALIDATION_ERROR", "重複提交識別碼已用於另一份錄音。", 409, false);
    }
    if (existing?.status === "completed" && existing.transcriptDe && existing.feedback) {
      return this.completedTranscriptionResponse(requestId, existing, true);
    }
    if (existing?.status === "transcription_failed") {
      return this.fallbackTranscriptionResponse(
        requestId,
        existing.id,
        existing.audioAssetId,
        normalizeProviderErrorCode(existing.errorCode),
        true,
      );
    }

    const prepared = existing
      ? { submissionId: existing.id, audioAssetId: existing.audioAssetId, created: false }
      : await this.options.repository.prepareSpeakingSubmission(learner, request);
    if (prepared.created) {
      try {
        await this.enforceDailyLimit(
          learner.profileId,
          "transcribe_audio",
          this.options.dailyTranscriptionLimit,
          "今日錄音轉錄額度已用完，請明天再試。",
        );
      } catch (error) {
        if (!(error instanceof ApiError) || error.code !== "RATE_LIMITED") {
          throw error;
        }
        await this.options.repository.markSpeakingFailed(
          learner.profileId,
          prepared.submissionId,
          "RATE_LIMITED",
        );
        await this.options.repository.recordUsage({
          learnerId: learner.profileId,
          requestId,
          idempotencyKey: request.idempotencyKey,
          feature: "transcribe_audio",
          model: this.options.provider.transcriptionModel,
          latencyMs: 0,
          success: false,
          cached: false,
          logicalRequest: true,
          errorCode: "RATE_LIMITED",
        });
        return this.fallbackTranscriptionResponse(
          requestId,
          prepared.submissionId,
          prepared.audioAssetId,
          "RATE_LIMITED",
          false,
        );
      }
    }
    if (!this.options.provider.configured) {
      await this.options.repository.markSpeakingFailed(
        learner.profileId,
        prepared.submissionId,
        "AI_NOT_CONFIGURED",
      );
      await this.logUnavailable(
        learner.profileId,
        requestId,
        request.idempotencyKey,
        "transcribe_audio",
        this.options.provider.transcriptionModel,
      );
      return this.fallbackTranscriptionResponse(
        requestId,
        prepared.submissionId,
        prepared.audioAssetId,
        "AI_NOT_CONFIGURED",
        false,
      );
    }

    try {
      const bytes = await this.options.repository.downloadSpeakingAudio(request.storagePath);
      const result = await this.options.provider.transcribe({
        bytes,
        fileName: fileNameFromPath(request.storagePath),
        mimeType: request.mimeType,
        targetDe: prompt.targetDe,
        durationMs: request.durationMs,
      });
      if (!result.transcriptDe.trim()) {
        throw new AudioProviderError("NETWORK_ERROR", "轉錄結果為空白。", true);
      }
      const wordTimings = normalizeWordTimings(
        result.wordTimings,
        result.transcriptDe,
        request.durationMs,
      );
      const scored = scoreWordComparison(prompt.targetDe, result.transcriptDe);
      const feedback = buildSpeakingFeedback(
        prompt,
        result.transcriptDe,
        wordTimings,
        scored,
        request.durationMs,
      );
      await this.options.repository.recordSpeakingResult({
        learnerId: learner.profileId,
        submissionId: prepared.submissionId,
        transcriptDe: result.transcriptDe,
        wordTimings,
        comparison: scored.comparison,
        feedback,
        wordsPerMinute: feedback.wordsPerMinute,
        model: result.model,
      });
      await this.options.repository.recordUsage({
        learnerId: learner.profileId,
        requestId,
        idempotencyKey: request.idempotencyKey,
        feature: "transcribe_audio",
        model: result.model,
        ...(result.providerRequestId ? { providerRequestId: result.providerRequestId } : {}),
        latencyMs: result.latencyMs,
        success: true,
        cached: false,
        logicalRequest: prepared.created,
      });
      return {
        requestId,
        submissionId: prepared.submissionId,
        audioAssetId: prepared.audioAssetId,
        status: "completed",
        transcriptDe: result.transcriptDe,
        wordTimings,
        comparison: scored.comparison,
        feedback,
        model: result.model,
        idempotentReplay: !prepared.created,
        retryable: false,
        fallbackReason: null,
      };
    } catch (error) {
      const code = normalizeProviderErrorCode(
        error instanceof AudioProviderError ? error.code : "NETWORK_ERROR",
      );
      await this.options.repository.markSpeakingFailed(
        learner.profileId,
        prepared.submissionId,
        code,
      );
      await this.recordProviderFailure(
        learner.profileId,
        requestId,
        request.idempotencyKey,
        "transcribe_audio",
        this.options.provider.transcriptionModel,
        error,
        prepared.created,
      );
      return this.fallbackTranscriptionResponse(
        requestId,
        prepared.submissionId,
        prepared.audioAssetId,
        code,
        false,
      );
    }
  }

  async deleteSpeakingSubmission(
    accessToken: string,
    submissionId: string,
  ): Promise<DeleteSpeakingSubmissionResponse> {
    const requestId = this.requestId();
    const learner = await this.requireLearner(accessToken);
    const owned = await this.options.repository.getOwnedSpeakingSubmission(
      learner.profileId,
      submissionId,
    );
    if (!owned) {
      throw new ApiError("NOT_FOUND", "找不到可刪除的口說錄音。", 404, false);
    }
    await this.options.repository.deleteSpeakingSubmission(owned.audioAssetId, owned.storagePath);
    return { requestId, deleted: true };
  }

  private async requireLearner(accessToken: string) {
    const learner = await this.options.repository.authenticate(accessToken);
    if (!learner) {
      throw new ApiError("UNAUTHORIZED", "登入狀態已失效，請重新登入。", 401, false);
    }
    this.rateLimiter.assertAllowed(learner.profileId);
    return learner;
  }

  private async enforceDailyLimit(
    learnerId: string,
    feature: AudioUsageLogInputFeature,
    limit: number,
    message: string,
  ): Promise<void> {
    const since = new Date(this.now().getTime() - 24 * 60 * 60 * 1000).toISOString();
    const count = await this.options.repository.countRecentLogicalRequests(
      learnerId,
      feature,
      since,
    );
    if (count >= limit) {
      throw new ApiError("RATE_LIMITED", message, 429, true);
    }
  }

  private createTtsResponse(
    requestId: string,
    audio: {
      id: string;
      contentType: "audio/wav" | "audio/mpeg";
      voice: "marin" | "cedar";
      model: string;
    },
    signedUrl: string,
    cached: boolean,
  ): TextToSpeechResponse {
    return {
      requestId,
      audioAssetId: audio.id,
      signedUrl,
      expiresAt: new Date(this.now().getTime() + this.signedUrlSeconds * 1000).toISOString(),
      contentType: audio.contentType,
      voice: audio.voice,
      model: audio.model,
      cached,
    };
  }

  private completedTranscriptionResponse(
    requestId: string,
    submission: StoredSpeakingSubmission,
    idempotentReplay: boolean,
  ): TranscribeResponse {
    return {
      requestId,
      submissionId: submission.id,
      audioAssetId: submission.audioAssetId,
      status: "completed",
      transcriptDe: submission.transcriptDe ?? null,
      wordTimings: submission.wordTimings,
      comparison: submission.comparison,
      feedback: submission.feedback ?? null,
      model: submission.model ?? this.options.provider.transcriptionModel,
      idempotentReplay,
      retryable: false,
      fallbackReason: null,
    };
  }

  private fallbackTranscriptionResponse(
    requestId: string,
    submissionId: string,
    audioAssetId: string,
    fallbackReason: AudioProviderErrorCode,
    idempotentReplay: boolean,
  ): TranscribeResponse {
    return {
      requestId,
      submissionId,
      audioAssetId,
      status: "fallback",
      transcriptDe: null,
      wordTimings: [],
      comparison: [],
      feedback: null,
      model: this.options.provider.transcriptionModel,
      idempotentReplay,
      retryable: fallbackReason !== "AI_NOT_CONFIGURED",
      fallbackReason,
    };
  }

  private async logUnavailable(
    learnerId: string,
    requestId: string,
    idempotencyKey: string,
    feature: AudioUsageLogInputFeature,
    model: string,
  ): Promise<void> {
    await this.options.repository.recordUsage({
      learnerId,
      requestId,
      idempotencyKey,
      feature,
      model,
      latencyMs: 0,
      success: false,
      cached: false,
      logicalRequest: true,
      errorCode: "AI_NOT_CONFIGURED",
    });
  }

  private async recordProviderFailure(
    learnerId: string,
    requestId: string,
    idempotencyKey: string,
    feature: AudioUsageLogInputFeature,
    model: string,
    error: unknown,
    logicalRequest = true,
  ): Promise<void> {
    const code = error instanceof AudioProviderError ? error.code : "NETWORK_ERROR";
    await this.options.repository.recordUsage({
      learnerId,
      requestId,
      idempotencyKey,
      feature,
      model,
      latencyMs: 0,
      success: false,
      cached: false,
      logicalRequest,
      errorCode: code,
    });
  }
}

type AudioProviderErrorCodeWithoutInvalid = AudioProviderErrorCode;
type AudioUsageLogInputFeature = "text_to_speech" | "transcribe_audio";

export interface WordComparisonScore {
  score: number;
  comparison: SpeechComparisonChange[];
  difficultWords: string[];
  matchedWords: number;
  targetWordCount: number;
}

export function scoreWordComparison(target: string, actual: string): WordComparisonScore {
  const targetWords = tokenizeGerman(target);
  const actualWords = tokenizeGerman(actual);
  const changes = diffArrays(
    targetWords.map((word) => word.toLocaleLowerCase("de-DE")),
    actualWords.map((word) => word.toLocaleLowerCase("de-DE")),
  );
  const comparison: SpeechComparisonChange[] = changes.map((change) => ({
    kind: change.removed ? "missing" : change.added ? "extra" : "unchanged",
    value: change.value.join(" "),
  }));
  const matchedWords = changes
    .filter((change) => !change.added && !change.removed)
    .reduce((sum, change) => sum + change.value.length, 0);
  const denominator = Math.max(1, targetWords.length, actualWords.length);
  const difficultWords = [
    ...new Set(
      changes
        .filter((change) => change.removed)
        .flatMap((change) => change.value)
        .filter((word) => word.length > 1),
    ),
  ].slice(0, 30);
  return {
    score: Math.round((matchedWords / denominator) * 100),
    comparison,
    difficultWords,
    matchedWords,
    targetWordCount: targetWords.length,
  };
}

export function buildSpeakingFeedback(
  prompt: ProtectedSpeakingPrompt,
  transcriptDe: string,
  timings: SpeechWordTiming[],
  scored: WordComparisonScore,
  durationMs: number,
): SpeakingFeedback {
  const spokenWordCount = tokenizeGerman(transcriptDe).length;
  const wordsPerMinute = Math.round(((spokenWordCount * 60_000) / durationMs) * 10) / 10;
  const pauses = timings
    .slice(0, -1)
    .map((word, index) => ({ word, next: timings[index + 1] }))
    .filter((entry): entry is { word: SpeechWordTiming; next: SpeechWordTiming } =>
      Boolean(entry.next),
    )
    .map(({ word, next }) => ({
      afterWord: word.word,
      positionMs: word.endMs,
      durationMs: Math.max(0, next.startMs - word.endMs),
    }))
    .filter((pause) => pause.durationMs >= 650)
    .slice(0, 20);
  const paceBand = wordsPerMinute < 85 ? "slow" : wordsPerMinute > 155 ? "fast" : "balanced";
  const pacePenalty =
    paceBand === "balanced" ? 0 : Math.min(30, Math.round(Math.abs(120 - wordsPerMinute) / 2));
  const pausePenalty = Math.min(35, pauses.length * 6);
  const alignmentScore = scored.score;
  const fluencyScore = clampScore(100 - pacePenalty - pausePenalty);
  const strengthsZhTw = [
    alignmentScore >= 85 ? "目標內容大多有被辨識出來。" : "已完成整段錄音並留下可比較的轉錄結果。",
    paceBand === "balanced"
      ? "整體語速落在適合練習的區間。"
      : "已建立本次語速基準，可用來比較下一次重錄。",
  ];
  const retryAdviceZhTw = [
    ...(scored.difficultWords.length > 0
      ? [`先分段練習未被辨識的詞：${scored.difficultWords.slice(0, 6).join("、")}。`]
      : ["再錄一次，嘗試維持相同清晰度並讓句子更連貫。"]),
    ...(paceBand === "slow"
      ? ["下一次稍微縮短詞與詞之間的停頓。"]
      : paceBand === "fast"
        ? ["下一次放慢速度，讓重音與句尾更清楚。"]
        : []),
    ...(pauses.length > 0 ? ["先在標點處換氣，避免在語意單位中間停頓。"] : []),
  ].slice(0, 10);

  return {
    contentScore: alignmentScore,
    grammarScore: clampScore(Math.round(alignmentScore * 0.9 + 10)),
    fluencyScore,
    intelligibilityScore: clampScore(
      Math.round((scored.matchedWords / Math.max(1, scored.targetWordCount)) * 100),
    ),
    wordsPerMinute,
    paceBand,
    pauses,
    suspectedPronunciationWords: scored.difficultWords,
    strengthsZhTw,
    retryAdviceZhTw,
    disclaimerZhTw:
      "此結果依語音轉文字與目標句比對產生，只能輔助判讀內容、流暢度與疑似需重練的詞，不是精確的發音評分。",
  };
}

function normalizeWordTimings(
  timings: SpeechWordTiming[],
  transcript: string,
  durationMs: number,
): SpeechWordTiming[] {
  const valid = timings
    .filter((timing) => timing.word.trim() && timing.startMs >= 0 && timing.endMs > timing.startMs)
    .map((timing) => ({
      word: timing.word.trim(),
      startMs: Math.min(durationMs - 1, Math.round(timing.startMs)),
      endMs: Math.min(durationMs, Math.max(1, Math.round(timing.endMs))),
    }))
    .filter((timing) => timing.endMs > timing.startMs);
  if (valid.length > 0) {
    return valid;
  }
  const words = tokenizeGerman(transcript);
  const slot = Math.max(1, Math.floor(durationMs / Math.max(1, words.length)));
  return words.map((word, index) => ({
    word,
    startMs: Math.min(durationMs - 1, index * slot),
    endMs: Math.min(durationMs, Math.max(index * slot + 1, (index + 1) * slot - 20)),
  }));
}

function tokenizeGerman(value: string): string[] {
  return value.normalize("NFC").match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
}

function normalizeOption(value: string): string {
  return value.trim().toLocaleLowerCase("de-DE");
}

function normalizeProviderErrorCode(value: unknown): AudioProviderErrorCodeWithoutInvalid {
  return value === "AI_NOT_CONFIGURED" ||
    value === "AI_TIMEOUT" ||
    value === "RATE_LIMITED" ||
    value === "NETWORK_ERROR"
    ? value
    : "NETWORK_ERROR";
}

function fileNameFromPath(path: string): string {
  return path.split("/").at(-1) ?? "recording.webm";
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toAudioApiError(error: unknown, fallbackMessage: string): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (error instanceof AudioProviderError) {
    const status =
      error.code === "RATE_LIMITED" ? 429 : error.code === "AI_NOT_CONFIGURED" ? 503 : 502;
    return new ApiError(error.code, error.message, status, error.retryable);
  }
  return new ApiError("NETWORK_ERROR", fallbackMessage, 502, true);
}
