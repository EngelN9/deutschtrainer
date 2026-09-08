import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { OpenAiRealtimeProvider } from "./openAiRealtimeProvider";

afterEach(() => {
  jest.restoreAllMocks();
});

describe("OpenAiRealtimeProvider", () => {
  it("sends only server-controlled session data, SDP, and the opaque safety identifier", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response("v=0\r\nanswer", {
        status: 200,
        headers: { "content-type": "application/sdp", location: "/v1/realtime/calls/rtc_abc123" },
      }),
    );
    const provider = new OpenAiRealtimeProvider({
      apiKey: "provider-secret-key",
      model: "gpt-realtime-mini-2025-12-15",
      timeoutMs: 1_000,
    });

    await expect(
      provider.createCall({
        safetyIdentifier: `dt_${"a".repeat(64)}`,
        sdp: "v=0\r\noffer",
      }),
    ).resolves.toEqual({ callId: "rtc_abc123", sdp: "v=0\r\nanswer" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.openai.com/v1/realtime/calls");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      authorization: "Bearer provider-secret-key",
      "OpenAI-Safety-Identifier": `dt_${"a".repeat(64)}`,
    });

    const body = init?.body;
    expect(body).toBeInstanceOf(FormData);
    const serializedSession = String((body as FormData).get("session"));
    expect((body as FormData).get("sdp")).toBe("v=0\r\noffer");
    expect(serializedSession).toContain("gpt-realtime-mini-2025-12-15");
    expect(serializedSession).not.toContain("provider-secret-key");
    expect(serializedSession).not.toContain("profile-");
    expect(serializedSession).not.toContain("@");
  });

  it("maps provider failures and invalid SDP answers to a safe stable error", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response("provider detail", { status: 500 }));
    const provider = new OpenAiRealtimeProvider({
      apiKey: "provider-secret-key",
      model: "gpt-realtime-mini-2025-12-15",
      timeoutMs: 1_000,
    });

    await expect(
      provider.createCall({ safetyIdentifier: `dt_${"b".repeat(64)}`, sdp: "v=0\r\noffer" }),
    ).rejects.toMatchObject({
      code: "CLASSROOM_PROVIDER_ERROR",
      status: 502,
    });
    await expect(
      provider.createCall({ safetyIdentifier: `dt_${"b".repeat(64)}`, sdp: "v=0\r\noffer" }),
    ).rejects.toThrow("即時教室暫時無法建立連線。");

    fetchMock.mockResolvedValue(
      new Response("not an SDP answer", {
        status: 200,
        headers: { location: "/v1/realtime/calls/rtc_abc123" },
      }),
    );
    await expect(
      provider.createCall({ safetyIdentifier: `dt_${"b".repeat(64)}`, sdp: "v=0\r\noffer" }),
    ).rejects.toMatchObject({ code: "CLASSROOM_PROVIDER_ERROR", status: 502 });
  });

  it("refuses a call whose id it cannot learn", async () => {
    // Without the Location header the server could never end this call, so starting it would
    // create an unstoppable billable session. Fail instead.
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("v=0\r\nanswer", { status: 200 }));
    const provider = new OpenAiRealtimeProvider({
      apiKey: "provider-secret-key",
      model: "gpt-realtime-mini-2025-12-15",
      timeoutMs: 1_000,
    });

    await expect(
      provider.createCall({ safetyIdentifier: `dt_${"d".repeat(64)}`, sdp: "v=0\r\noffer" }),
    ).rejects.toMatchObject({ code: "CLASSROOM_PROVIDER_ERROR", status: 502 });
  });

  it.each([
    ["/v1/realtime/calls/rtc_abc123", "rtc_abc123"],
    ["https://api.openai.com/v1/realtime/calls/rtc_abc123", "rtc_abc123"],
    ["rtc_abc123", "rtc_abc123"],
    ["/v1/realtime/calls/rtc_abc123/", "rtc_abc123"],
  ])("reads the call id from Location %s", async (location, expected) => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response("v=0\r\nanswer", { status: 200, headers: { location } }));
    const provider = new OpenAiRealtimeProvider({
      apiKey: "k",
      model: "m",
      timeoutMs: 1_000,
    });

    await expect(
      provider.createCall({ safetyIdentifier: `dt_${"e".repeat(64)}`, sdp: "v=0\r\noffer" }),
    ).resolves.toMatchObject({ callId: expected });
  });

  it("hangs up an active call and treats an already-ended call as success", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response("", { status: 200 }));
    const provider = new OpenAiRealtimeProvider({
      apiKey: "provider-secret-key",
      model: "m",
      timeoutMs: 1_000,
    });

    await expect(provider.hangup("rtc_abc123")).resolves.toBe(true);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.openai.com/v1/realtime/calls/rtc_abc123/hangup");
    expect(init?.method).toBe("POST");

    fetchMock.mockResolvedValue(new Response("", { status: 404 }));
    await expect(provider.hangup("rtc_gone")).resolves.toBe(true);
  });

  it("reports a failed hangup instead of throwing, so a sweep continues", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
    const provider = new OpenAiRealtimeProvider({ apiKey: "k", model: "m", timeoutMs: 1_000 });

    await expect(provider.hangup("rtc_abc123")).resolves.toBe(false);
  });

  it("maps an aborted provider request to a retryable timeout without leaking the cause", async () => {
    jest
      .spyOn(global, "fetch")
      .mockRejectedValue(new DOMException("provider timeout detail", "AbortError"));
    const provider = new OpenAiRealtimeProvider({
      apiKey: "provider-secret-key",
      model: "gpt-realtime-mini-2025-12-15",
      timeoutMs: 1_000,
    });

    await expect(
      provider.createCall({ safetyIdentifier: `dt_${"c".repeat(64)}`, sdp: "v=0\r\noffer" }),
    ).rejects.toMatchObject({
      code: "CLASSROOM_PROVIDER_ERROR",
      retryable: true,
      status: 504,
    });
    await expect(
      provider.createCall({ safetyIdentifier: `dt_${"c".repeat(64)}`, sdp: "v=0\r\noffer" }),
    ).rejects.toThrow("即時教室連線逾時，請稍後再試。");
  });
});
