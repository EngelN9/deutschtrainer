import { describe, expect, it } from "@jest/globals";
import { readClassroomPublicConfig } from "./config";

describe("classroom public config", () => {
  it("accepts only explicit public endpoints and anon key", () => {
    expect(
      readClassroomPublicConfig({
        VITE_API_BASE_URL: "https://api.example.com/",
        VITE_SUPABASE_URL: "https://project.supabase.co/",
        VITE_SUPABASE_ANON_KEY: "public-anon-key",
      }),
    ).toEqual({
      apiBaseUrl: "https://api.example.com",
      supabaseUrl: "https://project.supabase.co",
      supabaseAnonKey: "public-anon-key",
    });
  });

  it("fails fast for missing or placeholder configuration", () => {
    expect(() => readClassroomPublicConfig({})).toThrow("虛擬教室缺少");
    expect(() =>
      readClassroomPublicConfig({
        VITE_API_BASE_URL: "http://localhost:8787",
        VITE_SUPABASE_URL: "http://localhost:54321",
        VITE_SUPABASE_ANON_KEY: "replace-with-local-anon-key",
      }),
    ).toThrow("虛擬教室缺少");
  });
});
