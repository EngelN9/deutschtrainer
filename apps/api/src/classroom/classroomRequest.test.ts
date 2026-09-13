import { describe, expect, it, jest } from "@jest/globals";
import { handleClassroomRealtimeCallRequest } from "../app";
import { ApiError } from "../errors";
import type { ClassroomServiceContract } from "./types";

function createService(result: string | ApiError = "v=0\r\nanswer") {
  const createRealtimeCall = jest.fn<ClassroomServiceContract["createRealtimeCall"]>(async () => {
    if (result instanceof ApiError) {
      throw result;
    }
    return result;
  });
  const endActiveSession = jest.fn<ClassroomServiceContract["endActiveSession"]>(async () => true);
  const sweepExpiredSessions = jest.fn<ClassroomServiceContract["sweepExpiredSessions"]>(
    async () => 0,
  );
  return { createRealtimeCall, endActiveSession, sweepExpiredSessions };
}

function createRequest(body: string, contentType = "application/sdp") {
  return new Request("https://api.example.com/classroom/realtime-call", {
    method: "POST",
    headers: {
      authorization: "Bearer learner-token",
      "content-type": contentType,
    },
    body,
  });
}

describe("classroom realtime call request", () => {
  it("returns an SDP answer without caching it", async () => {
    const service = createService();
    const response = await handleClassroomRealtimeCallRequest(
      createRequest("v=0\r\noffer"),
      service,
      "req_classroom",
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/sdp");
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.text()).resolves.toBe("v=0\r\nanswer");
    expect(service.createRealtimeCall).toHaveBeenCalledWith("learner-token", "v=0\r\noffer");
  });

  it.each([
    ["application/json", "v=0", 415],
    ["application/sdp", "   ", 400],
    ["application/sdp", "x".repeat(65_537), 413],
  ])("rejects invalid SDP transport input", async (contentType, body, status) => {
    const response = await handleClassroomRealtimeCallRequest(
      createRequest(body, contentType),
      createService(),
      "req_invalid",
    );
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR", requestId: "req_invalid" },
    });
  });

  it("maps provider failures to a stable public error", async () => {
    const response = await handleClassroomRealtimeCallRequest(
      createRequest("v=0\r\noffer"),
      createService(
        new ApiError("CLASSROOM_PROVIDER_ERROR", "即時教室暫時無法建立連線。", 502, true),
      ),
      "req_provider",
    );
    expect(response.status).toBe(502);
    const payload = JSON.stringify(await response.json());
    expect(payload).toContain("CLASSROOM_PROVIDER_ERROR");
    expect(payload).not.toContain("provider-key");
    expect(payload).not.toContain("stack");
  });
});
