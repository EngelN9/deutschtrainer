import type { TranscribeRequest } from "@deutschtrainer/validation";

export type RecordingMimeType = TranscribeRequest["mimeType"];

const SUPPORTED_MIME_TYPES: readonly RecordingMimeType[] = [
  "audio/m4a",
  "audio/mp4",
  "audio/mpeg",
  "audio/webm",
  "audio/wav",
  "audio/x-m4a",
];

/**
 * Browsers report codec parameters alongside the container, for example
 * `audio/webm;codecs=opus`, and casing is not guaranteed. Anything outside the accepted set
 * returns undefined so callers fall back rather than sending a value the API would reject.
 */
export function normalizeRecordingMimeType(raw: string | undefined): RecordingMimeType | undefined {
  if (!raw) {
    return undefined;
  }

  const base = raw.split(";")[0]?.trim().toLowerCase();

  return SUPPORTED_MIME_TYPES.find((supported) => supported === base);
}

/**
 * Reads what the recorder actually produced instead of assuming it from the platform.
 *
 * The web branch previously hardcoded `audio/webm`, which is wrong in Safari — its MediaRecorder
 * only ever emits AAC in MPEG-4 — so recordings were stored under the wrong extension, uploaded
 * with a mismatched content type, and declared incorrectly to transcription. Chrome and Firefox do
 * emit WebM, which is why it went unnoticed.
 *
 * Native recording is configured by expo-audio's HIGH_QUALITY preset, which is AAC in MPEG-4 on
 * both iOS and Android, so it needs no probing. Only the web recorder hands back a blob URL, which
 * is the same signal the screen already uses to decide whether to revoke the object URL.
 */
export async function resolveRecordingMimeType(uri: string): Promise<RecordingMimeType> {
  if (!uri.startsWith("blob:")) {
    return "audio/mp4";
  }

  try {
    const blob = await fetch(uri).then((response) => response.blob());
    return normalizeRecordingMimeType(blob.type) ?? "audio/mp4";
  } catch {
    return "audio/mp4";
  }
}
