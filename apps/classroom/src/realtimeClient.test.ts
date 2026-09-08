import { describe, expect, it, jest } from "@jest/globals";
import {
  microphoneErrorMessage,
  parseToolArguments,
  requestClassroomMicrophone,
  sendLearnerBoardNote,
  sendFunctionResult,
  shutdownClassroomResources,
} from "./realtimeClient";
import { milestoneOperations } from "./milestoneFixture";

describe("classroom realtime client boundaries", () => {
  it("validates tool arguments with the production operation schema", () => {
    const operation = milestoneOperations[0]!;
    expect(parseToolArguments(JSON.stringify(operation), operation.type)).toEqual(operation);
    expect(parseToolArguments("{not-json", "write_line")).toBeUndefined();
    expect(
      parseToolArguments(
        JSON.stringify({ ...operation, textDe: "<script>alert(1)</script>" }),
        operation.type,
      ),
    ).toBeUndefined();
  });

  it("takes the operation type from the tool name, not from the arguments", () => {
    // The wire shape. `response.function_call_arguments.done` carries the tool name in `name` and
    // only the declared parameters in `arguments` - the parameter schemas never include `type`.
    // Parsing `arguments` alone could not satisfy the discriminated union, so every real tool call
    // was rejected and the board drew only for the fixture, whose objects carry `type` themselves.
    const { type, ...wireArguments } = milestoneOperations[0]!;
    expect(JSON.stringify(wireArguments)).not.toContain('"type"');

    expect(parseToolArguments(JSON.stringify(wireArguments), type)).toEqual(milestoneOperations[0]);
    expect(parseToolArguments(JSON.stringify(wireArguments), undefined)).toBeUndefined();
    expect(parseToolArguments(JSON.stringify(wireArguments), "not_a_tool")).toBeUndefined();
  });

  it("provides actionable microphone permission and device messages", () => {
    expect(microphoneErrorMessage(new DOMException("denied", "NotAllowedError"))).toContain(
      "允許麥克風",
    );
    expect(microphoneErrorMessage(new DOMException("missing", "NotFoundError"))).toContain(
      "找不到可用麥克風",
    );
  });

  it("does not request a microphone for a typed lesson", async () => {
    const getUserMedia = jest.fn<MediaDevices["getUserMedia"]>();

    await expect(requestClassroomMicrophone("typed", { getUserMedia })).resolves.toBeUndefined();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("requests audio for a voice lesson", async () => {
    const microphone = { getTracks: () => [] } as unknown as MediaStream;
    const getUserMedia = jest.fn<MediaDevices["getUserMedia"]>(async () => microphone);

    await expect(requestClassroomMicrophone("voice", { getUserMedia })).resolves.toBe(microphone);
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  it("sends a typed learner turn and requests a tutor response", () => {
    const send = jest.fn();

    expect(sendLearnerBoardNote({ readyState: "open", send }, "  Ich lerne Deutsch.  ")).toBe(true);
    const sent = send.mock.calls.map(
      ([payload]) =>
        JSON.parse(payload as string) as {
          item?: {
            content?: Array<{ text?: string; type?: string }>;
            role?: string;
            type?: string;
          };
          type: string;
        },
    );
    expect(sent.map((event) => event.type)).toEqual([
      "conversation.item.create",
      "response.create",
    ]);
    expect(sent[0]?.item).toMatchObject({
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: expect.stringContaining("Ich lerne Deutsch.") }],
    });
  });

  it("requests a new response after returning a tool result", () => {
    // Adding the function_call_output item does not resume generation on its own. Without the
    // trailing response.create the tutor falls silent after its first tool call.
    const send = jest.fn();
    sendFunctionResult({ readyState: "open", send }, "call_1", {
      code: "APPLIED",
      message: "已套用。",
      success: true,
    });

    const sent = send.mock.calls.map(
      ([payload]) => JSON.parse(payload as string) as { type: string },
    );
    expect(sent.map((event) => event.type)).toEqual([
      "conversation.item.create",
      "response.create",
    ]);
  });

  it("sends nothing when the data channel is not open", () => {
    const send = jest.fn();
    sendFunctionResult({ readyState: "closed", send }, "call_1", undefined);
    expect(send).not.toHaveBeenCalled();
  });

  it("stops microphone, data channel, and peer connection", () => {
    const stopTrack = jest.fn();
    const closeChannel = jest.fn();
    const closePeer = jest.fn();
    shutdownClassroomResources(
      { getTracks: () => [{ stop: stopTrack } as unknown as MediaStreamTrack] },
      { close: closeChannel, readyState: "open" },
      { close: closePeer },
    );
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(closeChannel).toHaveBeenCalledTimes(1);
    expect(closePeer).toHaveBeenCalledTimes(1);
  });

  it("stops a typed connection without requiring a microphone stream", () => {
    const closeChannel = jest.fn();
    const closePeer = jest.fn();
    shutdownClassroomResources(
      undefined,
      { close: closeChannel, readyState: "open" },
      { close: closePeer },
    );
    expect(closeChannel).toHaveBeenCalledTimes(1);
    expect(closePeer).toHaveBeenCalledTimes(1);
  });
});
