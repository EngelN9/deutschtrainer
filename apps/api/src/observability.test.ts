import { describe, expect, it } from "@jest/globals";
import { createHttpRequestLog, resolveRequestId } from "./observability";

describe("API observability", () => {
  it("preserves a safe caller request id", () => {
    expect(resolveRequestId(" req.mobile-123 ", () => "generated")).toBe("req.mobile-123");
  });

  it("replaces malformed or oversized request ids", () => {
    expect(resolveRequestId("contains whitespace", () => "generated")).toBe("generated");
    expect(resolveRequestId("x".repeat(101), () => "generated")).toBe("generated");
  });

  it("creates a bounded structured request log without request content", () => {
    expect(
      createHttpRequestLog({
        requestId: "req-1",
        method: "POST",
        pathname: "/attempts",
        status: 201,
        durationMs: 12.6,
      }),
    ).toEqual({
      level: "info",
      event: "http_request",
      requestId: "req-1",
      method: "POST",
      pathname: "/attempts",
      status: 201,
      durationMs: 13,
    });
  });

  it("marks server failures as error-level request events", () => {
    expect(
      createHttpRequestLog({
        requestId: "req-2",
        method: "GET",
        pathname: "/health",
        status: 503,
        durationMs: -1,
      }),
    ).toMatchObject({ level: "error", durationMs: 0 });
  });
});
