import { describe, expect, it } from "@jest/globals";
import { applyCorsHeaders } from "./app";

describe("API CORS policy", () => {
  it("echoes only an explicitly allowed browser origin", () => {
    const response = applyCorsHeaders(
      new Response(null),
      "https://admin.example.com",
      new Set(["https://admin.example.com"]),
    );

    expect(response.headers.get("access-control-allow-origin")).toBe("https://admin.example.com");
    expect(response.headers.get("vary")).toContain("Origin");
  });

  it("does not expose an allow-origin header to unknown origins", () => {
    const response = applyCorsHeaders(
      new Response(null),
      "https://untrusted.example",
      new Set(["https://admin.example.com"]),
    );

    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("supports native clients that do not send an Origin header", () => {
    const response = applyCorsHeaders(
      new Response(null),
      null,
      new Set(["https://admin.example.com"]),
    );

    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("access-control-allow-methods")).toContain("GET");
  });
});
