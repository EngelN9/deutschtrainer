import { describe, expect, it } from "@jest/globals";
import { assertApiDeploymentConfig, readApiConfig, resolveCorsResponseOrigin } from "./config";

describe("API deployment config", () => {
  it("keeps local development defaults", () => {
    const config = readApiConfig({ SUPABASE_SERVICE_ROLE_KEY: "local-service-key" });

    expect(config.appEnv).toBe("local");
    expect(config.host).toBe("127.0.0.1");
    expect(config.port).toBe(8787);
    expect(config.corsAllowedOrigins).toEqual(["*"]);
    expect(config.publicAiEnabled).toBe(false);
    expect(config.aiPublicAccessMode).toBe("testers");
    expect(config.aiTestProfileIds).toEqual([]);
    expect(config.dailyFreeLimit).toBe(5);
    expect(config.writingDailyFreeLimit).toBe(2);
    expect(config.audioTtsDailyFreeLimit).toBe(5);
    expect(config.audioTranscriptionDailyFreeLimit).toBe(2);
    expect(config.globalAiDailyProviderCallLimit).toBe(100);
    expect(() => assertApiDeploymentConfig(config)).not.toThrow();
  });

  it("accepts a secure staging configuration", () => {
    const config = readApiConfig({
      APP_ENV: "staging",
      HOST: "0.0.0.0",
      PORT: "8080",
      CORS_ALLOWED_ORIGINS: "https://app.example.com, https://admin.example.com/",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "staging-service-key",
      AI_EVALUATION_FAKE_MODE: "false",
    });

    expect(config.host).toBe("0.0.0.0");
    expect(config.port).toBe(8080);
    expect(config.corsAllowedOrigins).toEqual([
      "https://app.example.com",
      "https://admin.example.com",
    ]);
    expect(() => assertApiDeploymentConfig(config)).not.toThrow();
  });

  it("rejects deterministic fixtures outside local and test", () => {
    const config = readApiConfig({
      APP_ENV: "production",
      CORS_ALLOWED_ORIGINS: "https://app.example.com",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "production-service-key",
      AI_EVALUATION_FAKE_MODE: "true",
    });

    expect(() => assertApiDeploymentConfig(config)).toThrow(
      "AI_EVALUATION_FAKE_MODE must be false",
    );
  });

  it("fails fast when public AI is enabled without an API-only provider key", () => {
    const config = readApiConfig({
      APP_ENV: "staging",
      CORS_ALLOWED_ORIGINS: "https://app.example.com",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "staging-service-key",
      AI_PUBLIC_ENABLED: "true",
    });

    expect(() => assertApiDeploymentConfig(config)).toThrow(
      "OPENAI_API_KEY is required when AI_PUBLIC_ENABLED=true",
    );
  });

  it("allows public AI only with deterministic fixtures in local test evidence", () => {
    const config = readApiConfig({
      APP_ENV: "local",
      SUPABASE_SERVICE_ROLE_KEY: "local-service-key",
      AI_EVALUATION_FAKE_MODE: "true",
      AI_PUBLIC_ENABLED: "true",
      AI_PUBLIC_ACCESS_MODE: "verified_learners",
    });

    expect(() => assertApiDeploymentConfig(config)).not.toThrow();
  });

  it("fails closed when tester-only public AI has no valid profile allowlist", () => {
    const providerEnvironment = {
      APP_ENV: "staging",
      CORS_ALLOWED_ORIGINS: "https://app.example.com",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "staging-service-key",
      OPENAI_API_KEY: "provider-key",
      AI_PUBLIC_ENABLED: "true",
      AI_PUBLIC_ACCESS_MODE: "testers",
    };

    expect(() => assertApiDeploymentConfig(readApiConfig(providerEnvironment))).toThrow(
      "AI_TEST_PROFILE_IDS must contain at least one profile ID",
    );
    expect(() =>
      readApiConfig({ ...providerEnvironment, AI_TEST_PROFILE_IDS: "not-a-profile-id" }),
    ).toThrow("AI_TEST_PROFILE_IDS must contain comma-separated UUIDs");
  });

  it("requires HTTPS Supabase in staging and production", () => {
    const config = readApiConfig({
      APP_ENV: "staging",
      CORS_ALLOWED_ORIGINS: "https://app.example.com",
      SUPABASE_URL: "http://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "staging-service-key",
    });

    expect(() => assertApiDeploymentConfig(config)).toThrow("SUPABASE_URL must use HTTPS");
  });

  it("requires an explicit remote HTTPS CORS allowlist outside local and test", () => {
    const baseEnvironment = {
      APP_ENV: "staging",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "staging-service-key",
    };

    expect(() => assertApiDeploymentConfig(readApiConfig(baseEnvironment))).toThrow(
      "CORS_ALLOWED_ORIGINS is required",
    );
    expect(() =>
      assertApiDeploymentConfig(readApiConfig({ ...baseEnvironment, CORS_ALLOWED_ORIGINS: "*" })),
    ).toThrow("must not contain *");
    expect(() =>
      assertApiDeploymentConfig(
        readApiConfig({ ...baseEnvironment, CORS_ALLOWED_ORIGINS: "http://localhost:3000" }),
      ),
    ).toThrow("remote HTTPS origins");
  });

  it("resolves only configured browser origins", () => {
    const allowedOrigins = ["https://app.example.com", "https://admin.example.com"];

    expect(resolveCorsResponseOrigin("https://app.example.com", allowedOrigins)).toBe(
      "https://app.example.com",
    );
    expect(resolveCorsResponseOrigin("https://evil.example.com", allowedOrigins)).toBeUndefined();
    expect(resolveCorsResponseOrigin(undefined, allowedOrigins)).toBeUndefined();
    expect(resolveCorsResponseOrigin("http://localhost:8081", ["*"])).toBe("*");
  });

  it("rejects unknown environments and missing service credentials", () => {
    expect(() => readApiConfig({ APP_ENV: "preview" })).toThrow("APP_ENV must be one of");
    expect(() => assertApiDeploymentConfig(readApiConfig({ APP_ENV: "local" }))).toThrow(
      "SUPABASE_SERVICE_ROLE_KEY is required",
    );
  });
});
