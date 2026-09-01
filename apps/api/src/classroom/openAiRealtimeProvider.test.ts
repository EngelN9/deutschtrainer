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
        headers: { "content-type": "application/sdp" },
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
    ).resolves.toBe("v=0\r\nanswer");

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

    fetchMock.mockResolvedValue(new Response("not an SDP answer", { status: 200 }));
    await expect(
      provider.createCall({ safetyIdentifier: `dt_${"b".repeat(64)}`, sdp: "v=0\r\noffer" }),
    ).rejects.toMatchObject({ code: "CLASSROOM_PROVIDER_ERROR", status: 502 });
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
