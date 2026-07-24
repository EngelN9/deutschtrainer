import { describe, expect, it } from "@jest/globals";
import { readMobileEnv } from "./env";

describe("mobile public environment", () => {
  it("keeps local Demo defaults", () => {
    const config = readMobileEnv({});

    expect(config.appEnvironment).toBe("local");
    expect(config.contentSource).toBe("mock");
    expect(config.apiBaseUrl).toBe("http://localhost:8787");
  });

  it("accepts a connected preview configuration", () => {
    const config = readMobileEnv({
      EXPO_PUBLIC_APP_ENV: "preview",
      EXPO_PUBLIC_CONTENT_SOURCE: "api",
      EXPO_PUBLIC_API_BASE_URL: "https://api.staging.example.com",
      EXPO_PUBLIC_API_RELEASE: "api-sha-456",
      EXPO_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key-with-enough-length",
      EXPO_PUBLIC_APP_RELEASE: "git-sha-123",
      EXPO_PUBLIC_CONTENT_RELEASE: "content-42",
    });

    expect(config.appEnvironment).toBe("preview");
    expect(config.apiRelease).toBe("api-sha-456");
    expect(config.appRelease).toBe("git-sha-123");
    expect(config.contentRelease).toBe("content-42");
  });

  it("rejects mock and local URLs outside local development", () => {
    expect(() =>
      readMobileEnv({
        EXPO_PUBLIC_APP_ENV: "preview",
        EXPO_PUBLIC_CONTENT_SOURCE: "mock",
      }),
    ).toThrow("必須使用 EXPO_PUBLIC_CONTENT_SOURCE=api");

    expect(() =>
      readMobileEnv({
        EXPO_PUBLIC_APP_ENV: "production",
        EXPO_PUBLIC_CONTENT_SOURCE: "api",
        EXPO_PUBLIC_API_BASE_URL: "http://localhost:8787",
        EXPO_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        EXPO_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key-with-enough-length",
      }),
    ).toThrow("非本機 HTTPS URL");
  });

  it("rejects placeholder public credentials in connected builds", () => {
    expect(() =>
      readMobileEnv({
        EXPO_PUBLIC_APP_ENV: "preview",
        EXPO_PUBLIC_CONTENT_SOURCE: "api",
        EXPO_PUBLIC_API_BASE_URL: "https://api.staging.example.com",
        EXPO_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        EXPO_PUBLIC_SUPABASE_ANON_KEY: "replace-with-anon-key",
      }),
    ).toThrow("有效的 EXPO_PUBLIC_SUPABASE_ANON_KEY");
  });

  it("requires release identifiers in connected builds", () => {
    expect(() =>
      readMobileEnv({
        EXPO_PUBLIC_APP_ENV: "preview",
        EXPO_PUBLIC_CONTENT_SOURCE: "api",
        EXPO_PUBLIC_API_BASE_URL: "https://api.staging.example.com",
        EXPO_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        EXPO_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key-with-enough-length",
      }),
    ).toThrow("release 識別碼");
  });
});
