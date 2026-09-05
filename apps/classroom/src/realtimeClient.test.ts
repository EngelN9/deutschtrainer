import { describe, expect, it, jest } from "@jest/globals";
import {
  microphoneErrorMessage,
  parseToolArguments,
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
});
