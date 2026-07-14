import OpenAI, { toFile } from "openai";
import type {
  AudioProvider,
  SynthesizeSpeechInput,
  SynthesizeSpeechResult,
  TranscribeSpeechInput,
  TranscribeSpeechResult,
} from "./types";

export type AudioProviderErrorCode =
  "AI_NOT_CONFIGURED" | "AI_TIMEOUT" | "NETWORK_ERROR" | "RATE_LIMITED";

export class AudioProviderError extends Error {
  constructor(
    readonly code: AudioProviderErrorCode,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "AudioProviderError";
  }
}

export interface OpenAiAudioProviderOptions {
  apiKey: string;
  ttsModel: string;
  transcriptionModel: string;
  timeoutMs: number;
}

export class OpenAiAudioProvider implements AudioProvider {
  readonly configured = true;
  readonly ttsModel: string;
  readonly transcriptionModel: string;
  private readonly client: OpenAI;

  constructor(options: OpenAiAudioProviderOptions) {
    this.ttsModel = options.ttsModel;
    this.transcriptionModel = options.transcriptionModel;
    this.client = new OpenAI({
      apiKey: options.apiKey,
      maxRetries: 0,
      timeout: options.timeoutMs,
    });
  }

  async synthesize(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult> {
    const startedAt = Date.now();
    try {
      const response = await this.client.audio.speech.create({
        model: this.ttsModel,
        voice: input.voice,
        input: input.textDe,
        ...(this.ttsModel.startsWith("gpt-4o-mini-tts")
          ? { instructions: input.instructions }
          : {}),
        response_format: "wav",
      });
      return {
        bytes: new Uint8Array(await response.arrayBuffer()),
        contentType: "audio/wav",
        model: this.ttsModel,
        latencyMs: Math.max(0, Date.now() - startedAt),
      };
    } catch (error) {
      throw classifyOpenAiAudioError(error, "語音合成");
    }
  }

  async transcribe(input: TranscribeSpeechInput): Promise<TranscribeSpeechResult> {
    const startedAt = Date.now();
    try {
      const file = await toFile(input.bytes, input.fileName, { type: input.mimeType });
      const payload =
        this.transcriptionModel === "whisper-1"
          ? ((await this.client.audio.transcriptions.create({
              file,
              model: this.transcriptionModel,
              language: "de",
              prompt: input.targetDe,
              response_format: "verbose_json",
              timestamp_granularities: ["word"],
            })) as unknown as {
              text: string;
              words?: Array<{ word: string; start: number; end: number }>;
            })
          : await this.transcribeWithoutProviderTimings(file, input);
      return {
        transcriptDe: payload.text.trim(),
        wordTimings: (payload.words ?? []).map((word) => ({
          word: word.word.trim(),
          startMs: Math.max(0, Math.round(word.start * 1000)),
          endMs: Math.max(1, Math.round(word.end * 1000)),
        })),
        model: this.transcriptionModel,
        latencyMs: Math.max(0, Date.now() - startedAt),
      };
    } catch (error) {
      throw classifyOpenAiAudioError(error, "錄音轉錄");
    }
  }

  private async transcribeWithoutProviderTimings(
    file: Awaited<ReturnType<typeof toFile>>,
    input: TranscribeSpeechInput,
  ): Promise<{ text: string; words: Array<{ word: string; start: number; end: number }> }> {
    const response = await this.client.audio.transcriptions.create({
      file,
      model: this.transcriptionModel,
      language: "de",
      prompt: input.targetDe,
      response_format: "json",
    });
    const text = response.text.trim();
    const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
    const slotSeconds = input.durationMs / 1000 / Math.max(1, words.length);
    return {
      text,
      words: words.map((word, index) => ({
        word,
        start: index * slotSeconds,
        end: Math.min(input.durationMs / 1000, (index + 1) * slotSeconds),
      })),
    };
  }
}

export class UnavailableAudioProvider implements AudioProvider {
  readonly configured = false;

  constructor(
    readonly ttsModel: string,
    readonly transcriptionModel: string,
  ) {}

  async synthesize(): Promise<SynthesizeSpeechResult> {
    throw new AudioProviderError("AI_NOT_CONFIGURED", "伺服器尚未設定語音服務。", true);
  }

  async transcribe(): Promise<TranscribeSpeechResult> {
    throw new AudioProviderError("AI_NOT_CONFIGURED", "伺服器尚未設定轉錄服務。", true);
  }
}

export class DeterministicAudioProvider implements AudioProvider {
  readonly configured = true;
  readonly ttsModel = "local-audio-fixture";
  readonly transcriptionModel = "local-transcription-fixture";

  async synthesize(): Promise<SynthesizeSpeechResult> {
    return {
      bytes: createFixtureWav(),
      contentType: "audio/wav",
      model: this.ttsModel,
      providerRequestId: `tts-fixture-${Date.now()}`,
      latencyMs: 5,
    };
  }

  async transcribe(input: TranscribeSpeechInput): Promise<TranscribeSpeechResult> {
    const words = input.targetDe.match(/[\p{L}\p{N}]+/gu) ?? [];
    const slot = Math.max(180, Math.floor(input.durationMs / Math.max(1, words.length)));
    return {
      transcriptDe: input.targetDe,
      wordTimings: words.map((word, index) => ({
        word,
        startMs: index * slot,
        endMs: Math.min(input.durationMs, index * slot + Math.max(120, slot - 40)),
      })),
      model: this.transcriptionModel,
      providerRequestId: `transcription-fixture-${Date.now()}`,
      latencyMs: 5,
    };
  }
}

function createFixtureWav(): Uint8Array {
  const sampleRate = 16_000;
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
  for (let index = 0; index < sampleCount; index += 1) {
    const envelope = Math.min(1, index / 800, (sampleCount - index) / 800);
    const sample = Math.round(Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 1800 * envelope);
    buffer.writeInt16LE(sample, 44 + index * 2);
  }
  return new Uint8Array(buffer);
}

function classifyOpenAiAudioError(error: unknown, operation: string): AudioProviderError {
  const status = readNumberProperty(error, "status");
  const name = readStringProperty(error, "name");
  if (status === 429) {
    return new AudioProviderError("RATE_LIMITED", `${operation}目前呼叫過於頻繁。`, true);
  }
  if (name.includes("Timeout") || name.includes("Abort")) {
    return new AudioProviderError("AI_TIMEOUT", `${operation}逾時，請稍後重試。`, true);
  }
  if (status !== undefined && status >= 400 && status < 500) {
    return new AudioProviderError(
      "NETWORK_ERROR",
      `${operation}要求被服務商拒絕，請檢查伺服器設定。`,
      false,
    );
  }
  return new AudioProviderError("NETWORK_ERROR", `無法連線至${operation}服務。`, true);
}

function readNumberProperty(value: unknown, key: string): number | undefined {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return undefined;
  }
  const property = (value as Record<string, unknown>)[key];
  return typeof property === "number" ? property : undefined;
}

function readStringProperty(value: unknown, key: string): string {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return "";
  }
  const property = (value as Record<string, unknown>)[key];
  return typeof property === "string" ? property : "";
}
