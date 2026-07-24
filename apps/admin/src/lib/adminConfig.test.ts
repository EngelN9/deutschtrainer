import { describe, expect, it } from "@jest/globals";
import { readAdminPublicConfig } from "./adminConfig";

describe("admin public environment", () => {
  it("keeps an unconfigured local build in setup mode", () => {
    expect(readAdminPublicConfig({})).toBeUndefined();
  });

  it("preserves local URL defaults once Supabase is configured", () => {
    const config = readAdminPublicConfig({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-anon-key-with-enough-length",
    });

    expect(config?.apiBaseUrl).toBe("http://localhost:8787");
    expect(config?.siteUrl).toBe("http://localhost:3000");
  });

  it("accepts a complete staging configuration", () => {
    const config = readAdminPublicConfig({
      NEXT_PUBLIC_APP_ENV: "staging",
      NEXT_PUBLIC_API_BASE_URL: "https://api.staging.example.com",
      NEXT_PUBLIC_SITE_URL: "https://staging.example.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key-with-enough-length",
      NEXT_PUBLIC_RELEASE_ID: "git-sha-123",
    });

    expect(config?.appEnvironment).toBe("staging");
    expect(config?.releaseId).toBe("git-sha-123");
  });

  it("rejects incomplete or local staging endpoints", () => {
    expect(() =>
      readAdminPublicConfig({
        NEXT_PUBLIC_APP_ENV: "staging",
        NEXT_PUBLIC_API_BASE_URL: "http://localhost:8787",
        NEXT_PUBLIC_SITE_URL: "https://staging.example.com",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key-with-enough-length",
        NEXT_PUBLIC_RELEASE_ID: "git-sha-123",
      }),
    ).toThrow("非本機 HTTPS URL");
  });
});
