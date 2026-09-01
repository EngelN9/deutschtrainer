import { classroomToolOperationSchema } from "@deutschtrainer/validation";
import type { OperationResult } from "./boardReducer";

export type ClassroomConnectionStatus =
  "idle" | "requesting_microphone" | "connecting" | "connected" | "stopped" | "error";

export interface ClassroomConnectionCallbacks {
  onOperation: (operation: unknown, turnId: string) => OperationResult | undefined;
  onStatus: (status: ClassroomConnectionStatus, message: string) => void;
  onSupersedeTurn: (turnId: string) => void;
  onTurnStarted: (turnId: string) => void;
}

export interface ClassroomConnection {
  stop: () => void;
}

interface RealtimeEvent {
  arguments?: string;
  call_id?: string;
  response?: { id?: string };
  response_id?: string;
  type?: string;
}

export function classroomAbortError(): DOMException {
  return new DOMException("已取消建立教室連線。", "AbortError");
}

export async function createClassroomConnection(options: {
  accessToken: string;
  apiBaseUrl: string;
  audioElement: HTMLAudioElement;
  callbacks: ClassroomConnectionCallbacks;
  maximumDurationMs?: number;
  signal?: AbortSignal;
}): Promise<ClassroomConnection> {
  const { callbacks, signal } = options;
  if (signal?.aborted) throw classroomAbortError();
  callbacks.onStatus("requesting_microphone", "正在請求麥克風權限…");

  let microphone: MediaStream;
  try {
    microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    callbacks.onStatus("error", microphoneErrorMessage(error));
    throw error;
  }

  // Stop was pressed, or the component unmounted, while the permission prompt was open. Nothing
  // downstream exists to clean up yet, so release the microphone here or it stays live.
  if (signal?.aborted) {
    for (const track of microphone.getTracks()) track.stop();
    callbacks.onStatus("stopped", "教室已停止，麥克風與連線均已關閉。");
    throw classroomAbortError();
  }

  const peerConnection = new RTCPeerConnection();
  const dataChannel = peerConnection.createDataChannel("oai-events");
  let activeTurnId: string | undefined;
  let stopped = false;
  const shutdownTimer: { value?: number } = {};

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (shutdownTimer.value !== undefined) clearTimeout(shutdownTimer.value);
    shutdownClassroomResources(microphone, dataChannel, peerConnection);
    options.audioElement.srcObject = null;
    callbacks.onStatus("stopped", "教室已停止，麥克風與連線均已關閉。");
  };

  // From here on there are resources to release, so aborting can go through the normal teardown.
  signal?.addEventListener("abort", stop, { once: true });

  peerConnection.ontrack = (event) => {
    options.audioElement.srcObject = event.streams[0] ?? null;
  };
  for (const track of microphone.getTracks()) {
    peerConnection.addTrack(track, microphone);
  }

  dataChannel.onopen = () => callbacks.onStatus("connected", "已連線，可開始說德語。");
  dataChannel.onerror = () => {
    stop();
    callbacks.onStatus("error", "即時事件通道發生錯誤，請停止後重試。");
  };
  dataChannel.onclose = () => {
    if (!stopped) callbacks.onStatus("error", "即時事件通道已中斷，請重新連線。");
  };
  dataChannel.onmessage = (message) => {
    const event = parseRealtimeEvent(message.data);
    if (!event) return;
    if (event.type === "response.created" && event.response?.id) {
      activeTurnId = event.response.id;
      callbacks.onTurnStarted(activeTurnId);
      return;
    }
    if (event.type === "input_audio_buffer.speech_started" && activeTurnId) {
      callbacks.onSupersedeTurn(activeTurnId);
      if (dataChannel.readyState === "open") {
        dataChannel.send(JSON.stringify({ type: "response.cancel" }));
      }
      activeTurnId = undefined;
      return;
    }
    if (event.type === "response.function_call_arguments.done" && event.call_id) {
      // The event carries the owning response id. Trust it over any client-tracked value so a
      // tool call is always attributed to the turn that actually produced it.
      const turnId = event.response_id ?? activeTurnId;
      const operation = parseToolArguments(event.arguments);
      const result =
        operation && turnId
          ? callbacks.onOperation(operation, turnId)
          : {
              code: "INVALID_OPERATION" as const,
              message: "模型提供的白板操作格式不正確。",
              success: false,
            };
      sendFunctionResult(dataChannel, event.call_id, result);
    }
  };

  callbacks.onStatus("connecting", "正在建立安全的 WebRTC 連線…");
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    const offerSdp = offer.sdp;
    if (!offerSdp) {
      throw new Error("瀏覽器未產生有效的 WebRTC SDP，請重新整理後再試。");
    }
    const response = await fetch(`${options.apiBaseUrl}/classroom/realtime-call`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${options.accessToken}`,
        "content-type": "application/sdp",
      },
      body: offerSdp,
      signal: signal ?? null,
    });
    if (!response.ok) {
      throw new Error(await readSafeApiError(response));
    }
    const answerSdp = await response.text();
    await peerConnection.setRemoteDescription({ type: "answer", sdp: answerSdp });
  } catch (error) {
    stop();
    // A cancelled connect is a user action, not a failure. stop() already reported "stopped".
    if (signal?.aborted) throw classroomAbortError();
    callbacks.onStatus(
      "error",
      error instanceof Error ? error.message : "無法建立即時教室連線，請稍後重試。",
    );
    throw error;
  }

  if (signal?.aborted) {
    stop();
    throw classroomAbortError();
  }

  shutdownTimer.value = window.setTimeout(stop, options.maximumDurationMs ?? 300_000);
  return { stop };
}

export function shutdownClassroomResources(
  microphone: Pick<MediaStream, "getTracks">,
  dataChannel: Pick<RTCDataChannel, "close" | "readyState">,
  peerConnection: Pick<RTCPeerConnection, "close">,
): void {
  for (const track of microphone.getTracks()) track.stop();
  if (dataChannel.readyState !== "closed") dataChannel.close();
  peerConnection.close();
}

export function parseToolArguments(argumentsJson: string | undefined): unknown | undefined {
  if (!argumentsJson || argumentsJson.length > 16_384) return undefined;
  try {
    const parsed = JSON.parse(argumentsJson) as unknown;
    const result = classroomToolOperationSchema.safeParse(parsed);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

export function microphoneErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "麥克風權限遭拒。請在瀏覽器網址列允許麥克風後再試。";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "找不到可用麥克風。請連接麥克風並確認系統設定。";
  }
  return "無法啟用麥克風。請檢查裝置與瀏覽器權限後再試。";
}

function parseRealtimeEvent(value: unknown): RealtimeEvent | undefined {
  if (typeof value !== "string" || value.length > 65_536) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as RealtimeEvent) : undefined;
  } catch {
    return undefined;
  }
}

export function sendFunctionResult(
  dataChannel: Pick<RTCDataChannel, "readyState" | "send">,
  callId: string,
  result: OperationResult | undefined,
): void {
  if (dataChannel.readyState !== "open") return;
  dataChannel.send(
    JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify(
          result ?? { code: "INVALID_OPERATION", message: "操作未套用。", success: false },
        ),
      },
    }),
  );
  // Adding the output item does not resume generation on its own. Without this the model stalls
  // after the first tool call that returns a result.
  dataChannel.send(JSON.stringify({ type: "response.create" }));
}

async function readSafeApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: { message?: unknown } };
    if (typeof payload.error?.message === "string") return payload.error.message;
  } catch {
    // Fall through to the stable generic message.
  }
  return "無法建立即時教室連線，請稍後重試。";
}
