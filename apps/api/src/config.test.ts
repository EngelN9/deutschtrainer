import { describe, expect, it } from "@jest/globals";
import { assertApiDeploymentConfig, readApiConfig } from "./config";

describe("API deployment config", () => {
  it("keeps local development defaults", () => {
    const config = readApiConfig({ SUPABASE_SERVICE_ROLE_KEY: "local-service-key" });

    expect(config.appEnv).toBe("local");
    expect(config.host).toBe("127.0.0.1");
    expect(config.port).toBe(8787);
    expect(() => assertApiDeploymentConfig(config)).not.toThrow();
  });

  it("accepts a secure staging configuration", () => {
    const config = readApiConfig({
      APP_ENV: "staging",
      HOST: "0.0.0.0",
      PORT: "8080",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "staging-service-key",
      AI_EVALUATION_FAKE_MODE: "false",
    });

    expect(config.host).toBe("0.0.0.0");
    expect(config.port).toBe(8080);
    expect(() => assertApiDeploymentConfig(config)).not.toThrow();
  });

  it("rejects deterministic fixtures outside local and test", () => {
    const config = readApiConfig({
      APP_ENV: "production",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "production-service-key",
      AI_EVALUATION_FAKE_MODE: "true",
    });

    expect(() => assertApiDeploymentConfig(config)).toThrow(
      "AI_EVALUATION_FAKE_MODE must be false",
    );
  });

  it("requires HTTPS Supabase in staging and production", () => {
    const config = readApiConfig({
      APP_ENV: "staging",
      SUPABASE_URL: "http://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "staging-service-key",
    });

    expect(() => assertApiDeploymentConfig(config)).toThrow("SUPABASE_URL must use HTTPS");
  });

  it("rejects unknown environments and missing service credentials", () => {
    expect(() => readApiConfig({ APP_ENV: "preview" })).toThrow("APP_ENV must be one of");
    expect(() => assertApiDeploymentConfig(readApiConfig({ APP_ENV: "local" }))).toThrow(
      "SUPABASE_SERVICE_ROLE_KEY is required",
    );
  });
});
