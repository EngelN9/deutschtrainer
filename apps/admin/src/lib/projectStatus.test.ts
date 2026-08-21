import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { readRepositoryActivity, readServiceStatus } from "./projectStatus";

const originalFetch = globalThis.fetch;

function mockFetch(handler: (url: string) => unknown): void {
  globalThis.fetch = jest.fn(async (input: unknown) => handler(String(input))) as never;
}

function jsonResponse(body: unknown, ok = true): unknown {
  return { ok, json: async () => body };
}

function timeout(): never {
  const error = new Error("timed out");
  error.name = "TimeoutError";
  throw error;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("readServiceStatus", () => {
  it("reports unconfigured without reaching the network", async () => {
    mockFetch(() => {
      throw new Error("must not be called");
    });

    await expect(readServiceStatus(undefined)).resolves.toEqual({
      state: "unconfigured",
      aiPublicEnabled: null,
    });
  });

  it("reads the AI switch from a healthy service", async () => {
    mockFetch(() => jsonResponse({ status: "ok", aiPublicEnabled: false }));

    await expect(readServiceStatus("https://api.test")).resolves.toEqual({
      state: "ok",
      aiPublicEnabled: false,
    });
  });

  it("treats a timeout as a sleeping free instance, not an outage", async () => {
    mockFetch(timeout);

    await expect(readServiceStatus("https://api.test")).resolves.toMatchObject({
      state: "sleeping",
    });
  });

  it("reports unreachable for a non-timeout failure", async () => {
    mockFetch(() => {
      throw new Error("ECONNREFUSED");
    });

    await expect(readServiceStatus("https://api.test")).resolves.toMatchObject({
      state: "unreachable",
    });
  });

  it("reports unreachable for an error status", async () => {
    mockFetch(() => jsonResponse({}, false));

    await expect(readServiceStatus("https://api.test")).resolves.toMatchObject({
      state: "unreachable",
    });
  });

  it("tolerates a health payload without the AI field", async () => {
    mockFetch(() => jsonResponse({ status: "ok" }));

    await expect(readServiceStatus("https://api.test")).resolves.toEqual({
      state: "ok",
      aiPublicEnabled: null,
    });
  });
});

describe("readRepositoryActivity", () => {
  it("degrades to nulls when GitHub is unreachable, rather than throwing", async () => {
    mockFetch(() => {
      throw new Error("offline");
    });

    await expect(readRepositoryActivity()).resolves.toEqual({ changes: null, openCount: null });
  });

  it("degrades to nulls on a rate-limit response", async () => {
    mockFetch(() => jsonResponse({ message: "API rate limit exceeded" }, false));

    await expect(readRepositoryActivity()).resolves.toEqual({ changes: null, openCount: null });
  });

  it("keeps only merged pull requests, newest first", async () => {
    mockFetch((url) =>
      url.includes("state=open")
        ? jsonResponse([{ number: 9 }, { number: 10 }])
        : jsonResponse([
            { number: 1, title: "older", merged_at: "2026-01-01T00:00:00Z", html_url: "u1" },
            { number: 2, title: "closed unmerged", merged_at: null, html_url: "u2" },
            { number: 3, title: "newer", merged_at: "2026-02-01T00:00:00Z", html_url: "u3" },
          ]),
    );

    const activity = await readRepositoryActivity();

    expect(activity.openCount).toBe(2);
    expect(activity.changes?.map((change) => change.title)).toEqual(["newer", "older"]);
  });

  it("distinguishes no merged work from a failed lookup", async () => {
    mockFetch(() => jsonResponse([]));

    const activity = await readRepositoryActivity();

    expect(activity.changes).toEqual([]);
    expect(activity.openCount).toBe(0);
  });
});
