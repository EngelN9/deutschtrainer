import { File } from "expo-file-system";
import { Platform } from "react-native";
import {
  audioLearningWorkspaceResponseSchema,
  deleteSpeakingSubmissionResponseSchema,
  listeningActivityResponseSchema,
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
import { requestApi } from "../../lib/apiClient";
import { supabase } from "../../lib/supabase";

export async function getAudioLearningWorkspace(): Promise<AudioLearningWorkspace> {
  return requestApi("/users/me/audio-learning", audioLearningWorkspaceResponseSchema, {
    authenticated: true,
    fallbackMessage: "聽說訓練資料格式不完整，請稍後重新整理。",
  });
}

export async function requestListeningAudio(
  request: TextToSpeechRequest,
): Promise<TextToSpeechResponse> {
  return requestApi("/audio/text-to-speech", textToSpeechResponseSchema, {
    authenticated: true,
    body: request,
    fallbackMessage: "語音合成服務回傳格式不完整。",
    method: "POST",
  });
}

export async function revealListeningTranscript(
  request: RevealListeningTranscriptRequest,
): Promise<RevealListeningTranscriptResponse> {
  return requestApi("/listening/reveal-transcript", revealListeningTranscriptResponseSchema, {
    authenticated: true,
    body: request,
    fallbackMessage: "逐字稿服務回傳格式不完整。",
    method: "POST",
  });
}

export async function submitListeningDictation(
  request: SubmitDictationRequest,
): Promise<SubmitDictationResponse> {
  return requestApi("/listening/submit-dictation", submitDictationResponseSchema, {
    authenticated: true,
    body: request,
    fallbackMessage: "聽寫服務回傳格式不完整。",
    method: "POST",
  });
}

export async function recordListeningActivity(request: ListeningActivityRequest): Promise<string> {
  const response = await requestApi("/listening/activity", listeningActivityResponseSchema, {
    authenticated: true,
    body: request,
    fallbackMessage: "無法保存聽力播放進度。",
    method: "POST",
  });
  return response.attemptId;
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
  return requestApi("/audio/transcribe", transcribeResponseSchema, {
    authenticated: true,
    body: request,
    fallbackMessage: "錄音轉錄服務回傳格式不完整。",
    method: "POST",
  });
}

export async function deleteSpeakingSubmission(
  submissionId: string,
): Promise<DeleteSpeakingSubmissionResponse> {
  return requestApi(
    `/speaking/submissions/${encodeURIComponent(submissionId)}`,
    deleteSpeakingSubmissionResponseSchema,
    {
      authenticated: true,
      fallbackMessage: "無法刪除錄音。",
      method: "DELETE",
    },
  );
}

export async function deleteUploadedRecording(storagePath: string): Promise<void> {
  const result = await supabase.storage.from("speaking-audio").remove([storagePath]);
  if (result.error) {
    throw new Error(`無法清除未提交的錄音：${result.error.message}`);
  }
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

function extensionForMimeType(mimeType: TranscribeRequest["mimeType"]): string {
  if (mimeType === "audio/webm") return "webm";
  if (mimeType === "audio/wav") return "wav";
  if (mimeType === "audio/mpeg") return "mp3";
  return "m4a";
}

function safeFileName(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 180);
}
