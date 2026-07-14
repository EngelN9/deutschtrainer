import type {
  AudioVoice,
  CefrLevel,
  ListeningKind,
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
import type { AuthenticatedLearner } from "../evaluation/types";

export interface ProtectedListeningAsset {
  id: string;
  lessonId: string;
  level: CefrLevel;
  kind: ListeningKind;
  version: number;
  transcriptDe: string;
  comprehensionCorrectOption: string;
  ttsInstructions: string;
}

export interface ProtectedSpeakingPrompt {
  id: string;
  level: CefrLevel;
  targetDe: string;
  maximumSeconds: number;
  version: number;
}

export interface StoredGeneratedAudio {
  id: string;
  storagePath: string;
  contentType: "audio/wav" | "audio/mpeg";
  voice: AudioVoice;
  model: string;
}

export interface StoredListeningAttempt {
  id: string;
  listeningAssetId: string;
  sessionKey: string;
  dictationText: string;
  comprehensionAnswer: string;
}

export interface StoredSpeakingSubmission {
  id: string;
  audioAssetId: string;
  speakingPromptId: string;
  storagePath: string;
  status: "transcribing" | "completed" | "transcription_failed";
  transcriptDe?: string;
  wordTimings: SpeechWordTiming[];
  comparison: SpeechComparisonChange[];
  feedback?: SpeakingFeedback;
  model?: string;
  errorCode?: string;
}

export interface PreparedSpeakingSubmission {
  submissionId: string;
  audioAssetId: string;
  created: boolean;
}

export interface GeneratedAudioInput {
  asset: ProtectedListeningAsset;
  bytes: Uint8Array;
  cacheKey: string;
  contentType: "audio/wav" | "audio/mpeg";
  voice: AudioVoice;
  model: string;
}

export interface ListeningResultInput {
  learnerId: string;
  request: SubmitDictationRequest;
  score: number;
  comprehensionCorrect: boolean;
  difficultWords: string[];
}

export interface AudioUsageLogInput {
  learnerId: string;
  requestId: string;
  idempotencyKey: string;
  feature: "text_to_speech" | "transcribe_audio";
  model: string;
  providerRequestId?: string;
  latencyMs: number;
  success: boolean;
  cached: boolean;
  logicalRequest: boolean;
  errorCode?: string;
}

export interface AudioRepository {
  authenticate(accessToken: string): Promise<AuthenticatedLearner | undefined>;
  getWorkspace(learnerId: string): Promise<AudioLearningWorkspaceResponse>;
  getListeningAsset(assetId: string): Promise<ProtectedListeningAsset | undefined>;
  getSpeakingPrompt(promptId: string): Promise<ProtectedSpeakingPrompt | undefined>;
  findGeneratedAudio(cacheKey: string): Promise<StoredGeneratedAudio | undefined>;
  storeGeneratedAudio(input: GeneratedAudioInput): Promise<StoredGeneratedAudio>;
  createSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string>;
  countRecentLogicalRequests(
    learnerId: string,
    feature: AudioUsageLogInput["feature"],
    since: string,
  ): Promise<number>;
  recordUsage(input: AudioUsageLogInput): Promise<void>;
  recordListeningActivity(learnerId: string, request: ListeningActivityRequest): Promise<string>;
  findListeningAttemptByIdempotency(
    learnerId: string,
    idempotencyKey: string,
  ): Promise<StoredListeningAttempt | undefined>;
  recordListeningResult(input: ListeningResultInput): Promise<{
    attemptId: string;
    idempotentReplay: boolean;
  }>;
  findSpeakingSubmissionByIdempotency(
    learnerId: string,
    idempotencyKey: string,
  ): Promise<StoredSpeakingSubmission | undefined>;
  prepareSpeakingSubmission(
    learner: AuthenticatedLearner,
    request: TranscribeRequest,
  ): Promise<PreparedSpeakingSubmission>;
  downloadSpeakingAudio(storagePath: string): Promise<Uint8Array>;
  recordSpeakingResult(input: {
    learnerId: string;
    submissionId: string;
    transcriptDe: string;
    wordTimings: SpeechWordTiming[];
    comparison: SpeechComparisonChange[];
    feedback: SpeakingFeedback;
    wordsPerMinute: number;
    model: string;
  }): Promise<void>;
  markSpeakingFailed(learnerId: string, submissionId: string, errorCode: string): Promise<void>;
  getOwnedSpeakingSubmission(
    learnerId: string,
    submissionId: string,
  ): Promise<{ audioAssetId: string; storagePath: string } | undefined>;
  deleteSpeakingSubmission(audioAssetId: string, storagePath: string): Promise<void>;
}

export interface SynthesizeSpeechInput {
  textDe: string;
  voice: AudioVoice;
  instructions: string;
}

export interface SynthesizeSpeechResult {
  bytes: Uint8Array;
  contentType: "audio/wav" | "audio/mpeg";
  model: string;
  providerRequestId?: string;
  latencyMs: number;
}

export interface TranscribeSpeechInput {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  targetDe: string;
  durationMs: number;
}

export interface TranscribeSpeechResult {
  transcriptDe: string;
  wordTimings: SpeechWordTiming[];
  model: string;
  providerRequestId?: string;
  latencyMs: number;
}

export interface AudioProvider {
  readonly configured: boolean;
  readonly ttsModel: string;
  readonly transcriptionModel: string;
  synthesize(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult>;
  transcribe(input: TranscribeSpeechInput): Promise<TranscribeSpeechResult>;
}

export interface AudioLearningServiceContract {
  getWorkspace(accessToken: string): Promise<AudioLearningWorkspaceResponse>;
  recordActivity(
    accessToken: string,
    request: ListeningActivityRequest,
  ): Promise<ListeningActivityResponse>;
  synthesize(accessToken: string, request: TextToSpeechRequest): Promise<TextToSpeechResponse>;
  revealTranscript(
    accessToken: string,
    request: RevealListeningTranscriptRequest,
  ): Promise<RevealListeningTranscriptResponse>;
  submitDictation(
    accessToken: string,
    request: SubmitDictationRequest,
  ): Promise<SubmitDictationResponse>;
  transcribe(accessToken: string, request: TranscribeRequest): Promise<TranscribeResponse>;
  deleteSpeakingSubmission(
    accessToken: string,
    submissionId: string,
  ): Promise<DeleteSpeakingSubmissionResponse>;
}
