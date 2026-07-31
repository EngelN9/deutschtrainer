import { describe, expect, it } from "@jest/globals";
import { assertMobileReleaseConfig } from "../../app.config";

describe("Mobile release configuration", () => {
  it("allows local and mock preview configuration", () => {
    expect(() =>
      assertMobileReleaseConfig({
        DEUTSCHTRAINER_BUILD_PROFILE: "preview",
        EXPO_PUBLIC_CONTENT_SOURCE: "mock",
      }),
    ).not.toThrow();
  });

  it("requires connected production content and public configuration", () => {
    expect(() => assertMobileReleaseConfig({ DEUTSCHTRAINER_BUILD_PROFILE: "production" })).toThrow(
      "EXPO_PUBLIC_CONTENT_SOURCE=api",
    );
    expect(() =>
      assertMobileReleaseConfig({
        DEUTSCHTRAINER_BUILD_PROFILE: "production",
        EXPO_PUBLIC_CONTENT_SOURCE: "api",
        EXPO_PUBLIC_API_BASE_URL: "http://localhost:8787",
        EXPO_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        EXPO_PUBLIC_SUPABASE_ANON_KEY: "public-anon-fixture",
      }),
    ).toThrow("remote HTTPS EXPO_PUBLIC_API_BASE_URL");
  });

  it("accepts a remote HTTPS connected production configuration", () => {
    expect(() =>
      assertMobileReleaseConfig({
        DEUTSCHTRAINER_BUILD_PROFILE: "production",
        EXPO_PUBLIC_CONTENT_SOURCE: "api",
        EXPO_PUBLIC_API_BASE_URL: "https://api.example.test",
        EXPO_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        EXPO_PUBLIC_SUPABASE_ANON_KEY: "public-anon-fixture",
      }),
    ).not.toThrow();
  });
});
