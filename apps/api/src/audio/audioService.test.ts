import { describe, expect, it, jest } from "@jest/globals";
import type { AudioRepository } from "./types";
import { AudioLearningService, buildSpeakingFeedback, scoreWordComparison } from "./audioService";
import { DeterministicAudioProvider, UnavailableAudioProvider } from "./openAiAudioProvider";

const learner = {
  authUserId: "a2a0a460-f0a8-49d3-b046-4748eb241ce8",
  profileId: "6ff91bf7-37d7-4f24-8682-8ee5d3020a5f",
  timezone: "Asia/Taipei",
};

const listeningAsset = {
  id: "ced48daf-53ab-d040-93ea-85190838c379",
  lessonId: "7201fcca-f0c9-9bb7-218a-192849e5f84d",
  level: "B1" as const,
  kind: "announcement" as const,
  version: 1,
  transcriptDe: "Bitte rufen Sie spätestens am Mittwoch zurück.",
  comprehensionCorrectOption: "a",
  ttsInstructions: "Sprich klares Hochdeutsch.",
};

const speakingPrompt = {
  id: "7d38ae06-4fd6-4468-9bed-cc39c9d2ba3b",
  level: "B1" as const,
  targetDe: "Ich möchte einen neuen Termin vereinbaren.",
  maximumSeconds: 30,
  version: 1,
};

describe("audio learning helpers", () => {
  it("separates missing and extra German words while ignoring punctuation", () => {
    const result = scoreWordComparison(
      "Ich möchte spätestens am Mittwoch zurückrufen.",
      "Ich möchte am Donnerstag zurückrufen!",
    );

    expect(result.score).toBeLessThan(100);
    expect(result.comparison.map((change) => change.kind)).toContain("missing");
    expect(result.comparison.map((change) => change.kind)).toContain("extra");
    expect(result.difficultWords).toContain("spätestens");
  });

  it("marks long pauses and always includes the STT limitation", () => {
    const scored = scoreWordComparison(speakingPrompt.targetDe, speakingPrompt.targetDe);
    const feedback = buildSpeakingFeedback(
      speakingPrompt,
      speakingPrompt.targetDe,
      [
        { word: "Ich", startMs: 0, endMs: 300 },
        { word: "möchte", startMs: 1200, endMs: 1600 },
      ],
      scored,
      4000,
    );

    expect(feedback.pauses).toHaveLength(1);
    expect(feedback.disclaimerZhTw).toContain("不是精確的發音評分");
  });
});

describe("AudioLearningService", () => {
  it("serves a private cached TTS asset without invoking the provider", async () => {
    const provider = new DeterministicAudioProvider();
    const synthesize = jest.spyOn(provider, "synthesize");
    const recordUsage = jest.fn(async () => undefined);
    const repository = createRepository({
      findGeneratedAudio: async () => ({
        id: "b8f78c5f-0bdb-4a0b-bcbf-4eb89e633d1b",
        storagePath: `${listeningAsset.id}/cached.wav`,
        contentType: "audio/wav",
        voice: "marin",
        model: "local-audio-fixture",
      }),
      recordUsage,
    });
    const service = createService(repository, provider);

    const result = await service.synthesize("valid-token", {
      listeningAssetId: listeningAsset.id,
      voice: "marin",
      idempotencyKey: "phase7-cached-tts",
    });

    expect(result.cached).toBe(true);
    expect(result.signedUrl).toContain("token=test");
    expect(synthesize).not.toHaveBeenCalled();
    expect(recordUsage).toHaveBeenCalledWith(expect.objectContaining({ cached: true }));
  });

  it("keeps a deletable submission when transcription is unavailable", async () => {
    const markSpeakingFailed = jest.fn(async () => undefined);
    const repository = createRepository({ markSpeakingFailed });
    const service = createService(
      repository,
      new UnavailableAudioProvider("gpt-4o-mini-tts", "whisper-1"),
    );
    const result = await service.transcribe("valid-token", {
      speakingPromptId: speakingPrompt.id,
      storagePath: `${learner.authUserId}/recording.webm`,
      mimeType: "audio/webm",
      durationMs: 4000,
      idempotencyKey: "phase7-unavailable-stt",
    });

    expect(result.status).toBe("fallback");
    expect(result.fallbackReason).toBe("AI_NOT_CONFIGURED");
    expect(markSpeakingFailed).toHaveBeenCalledWith(
      learner.profileId,
      "d38d772d-39a4-4e85-bcdf-1402216eb61b",
      "AI_NOT_CONFIGURED",
    );
  });

  it("rejects an idempotency replay that points to a different recording", async () => {
    const provider = new DeterministicAudioProvider();
    const repository = createRepository({
      findSpeakingSubmissionByIdempotency: async () => ({
        id: "d38d772d-39a4-4e85-bcdf-1402216eb61b",
        audioAssetId: "a2a86251-337a-4fe3-8263-839fa5673732",
        speakingPromptId: speakingPrompt.id,
        storagePath: `${learner.authUserId}/original.webm`,
        status: "transcribing",
        wordTimings: [],
        comparison: [],
      }),
    });
    const service = createService(repository, provider);

    await expect(
      service.transcribe("valid-token", {
        speakingPromptId: speakingPrompt.id,
        storagePath: `${learner.authUserId}/replacement.webm`,
        mimeType: "audio/webm",
        durationMs: 4000,
        idempotencyKey: "phase7-path-conflict",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 409 });
  });
});

function createService(
  repository: AudioRepository,
  provider: DeterministicAudioProvider | UnavailableAudioProvider,
) {
  return new AudioLearningService({
    repository,
    provider,
    dailyTtsLimit: 20,
    dailyTranscriptionLimit: 10,
    now: () => new Date("2026-07-13T10:00:00.000Z"),
    requestId: () => "phase7-request-test",
  });
}

function createRepository(overrides: Partial<AudioRepository> = {}): AudioRepository {
  return {
    authenticate: async () => learner,
    getListeningAsset: async () => listeningAsset,
    getSpeakingPrompt: async () => speakingPrompt,
    findGeneratedAudio: async () => undefined,
    storeGeneratedAudio: async () => ({
      id: "b8f78c5f-0bdb-4a0b-bcbf-4eb89e633d1b",
      storagePath: `${listeningAsset.id}/generated.wav`,
      contentType: "audio/wav",
      voice: "marin",
      model: "local-audio-fixture",
    }),
    createSignedUrl: async (_bucket, path) => `http://localhost/storage/${path}?token=test`,
    countRecentLogicalRequests: async () => 0,
    recordUsage: async () => undefined,
    recordListeningActivity: async () => "2f48dbbe-2e97-4f4f-a795-d8d0cda0bfc2",
    findListeningAttemptByIdempotency: async () => undefined,
    recordListeningResult: async () => ({
      attemptId: "2f48dbbe-2e97-4f4f-a795-d8d0cda0bfc2",
      idempotentReplay: false,
    }),
    findSpeakingSubmissionByIdempotency: async () => undefined,
    prepareSpeakingSubmission: async () => ({
      submissionId: "d38d772d-39a4-4e85-bcdf-1402216eb61b",
      audioAssetId: "a2a86251-337a-4fe3-8263-839fa5673732",
      created: true,
    }),
    downloadSpeakingAudio: async () => new Uint8Array([1, 2, 3]),
    recordSpeakingResult: async () => undefined,
    markSpeakingFailed: async () => undefined,
    getOwnedSpeakingSubmission: async () => undefined,
    deleteSpeakingSubmission: async () => undefined,
    ...overrides,
  };
}
