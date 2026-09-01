import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { normalizeRecordingMimeType, resolveRecordingMimeType } from "./recordingMimeType";

describe("normalizeRecordingMimeType", () => {
  it("strips codec parameters that browsers append", () => {
    expect(normalizeRecordingMimeType("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(normalizeRecordingMimeType("audio/mp4; codecs=mp4a.40.2")).toBe("audio/mp4");
  });

  it("accepts what Safari reports, which is never WebM", () => {
    expect(normalizeRecordingMimeType("audio/mp4")).toBe("audio/mp4");
  });

  it("is case insensitive", () => {
    expect(normalizeRecordingMimeType("AUDIO/WEBM")).toBe("audio/webm");
  });

  it("rejects anything the transcription API would not accept", () => {
    expect(normalizeRecordingMimeType("video/webm")).toBeUndefined();
    expect(normalizeRecordingMimeType("audio/ogg")).toBeUndefined();
    expect(normalizeRecordingMimeType("")).toBeUndefined();
    expect(normalizeRecordingMimeType(undefined)).toBeUndefined();
  });
});

describe("resolveRecordingMimeType", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockBlobType(type: string): void {
    globalThis.fetch = jest.fn(async () => ({ blob: async () => ({ type }) })) as never;
  }

  it("reports what Safari actually recorded rather than assuming WebM", async () => {
    mockBlobType("audio/mp4");
    await expect(resolveRecordingMimeType("blob:https://example.test/abc")).resolves.toBe(
      "audio/mp4",
    );
  });

  it("reports WebM where the browser produces it", async () => {
    mockBlobType("audio/webm;codecs=opus");
    await expect(resolveRecordingMimeType("blob:https://example.test/abc")).resolves.toBe(
      "audio/webm",
    );
  });

  it("does not probe native recordings, which are file paths", async () => {
    globalThis.fetch = jest.fn(() => {
      throw new Error("native recordings must not be fetched");
    }) as never;

    await expect(resolveRecordingMimeType("file:///tmp/recording.m4a")).resolves.toBe("audio/mp4");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("falls back when the blob reports something unusable", async () => {
    mockBlobType("audio/ogg");
    await expect(resolveRecordingMimeType("blob:https://example.test/abc")).resolves.toBe(
      "audio/mp4",
    );
  });
});
