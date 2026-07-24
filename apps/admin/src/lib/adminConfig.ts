import { z } from "zod";

export type AdminAppEnvironment = "local" | "staging" | "production";

export interface AdminPublicConfig {
  apiBaseUrl: string;
  appEnvironment: AdminAppEnvironment;
  releaseId: string;
  siteUrl: string;
  supabaseAnonKey: string;
  supabaseUrl: string;
}

export interface AdminPublicEnvironment {
  NEXT_PUBLIC_API_BASE_URL?: string | undefined;
  NEXT_PUBLIC_APP_ENV?: string | undefined;
  NEXT_PUBLIC_RELEASE_ID?: string | undefined;
  NEXT_PUBLIC_SITE_URL?: string | undefined;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string | undefined;
  NEXT_PUBLIC_SUPABASE_URL?: string | undefined;
}

const environmentSchema = z.enum(["local", "staging", "production"]);

export function readAdminPublicConfig(env: AdminPublicEnvironment): AdminPublicConfig | undefined {
  const appEnvironment = parseEnvironment(env.NEXT_PUBLIC_APP_ENV);
  const apiBaseUrl =
    env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    (appEnvironment === "local" ? "http://localhost:8787" : undefined);
  const siteUrl =
    env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (appEnvironment === "local" ? "http://localhost:3000" : undefined);
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const releaseId = env.NEXT_PUBLIC_RELEASE_ID?.trim() || "local";

  if (
    appEnvironment === "local" &&
    (!supabaseUrl || !supabaseAnonKey || isPlaceholder(supabaseAnonKey))
  ) {
    return undefined;
  }

  if (!apiBaseUrl || !siteUrl || !supabaseUrl || !supabaseAnonKey) {
    throw new Error("管理後台缺少必要的 NEXT_PUBLIC_* 環境設定。");
  }

  const normalizedApiUrl = normalizeUrl(apiBaseUrl, "NEXT_PUBLIC_API_BASE_URL");
  const normalizedSiteUrl = normalizeUrl(siteUrl, "NEXT_PUBLIC_SITE_URL");
  const normalizedSupabaseUrl = normalizeUrl(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL");

  if (appEnvironment !== "local") {
    assertRemoteHttpsUrl(normalizedApiUrl, "NEXT_PUBLIC_API_BASE_URL");
    assertRemoteHttpsUrl(normalizedSiteUrl, "NEXT_PUBLIC_SITE_URL");
    assertRemoteHttpsUrl(normalizedSupabaseUrl, "NEXT_PUBLIC_SUPABASE_URL");
    if (isPlaceholder(supabaseAnonKey)) {
      throw new Error("staging 與 production 必須設定有效的 Supabase anon key。");
    }
    if (releaseId === "local" || isLiteralPlaceholder(releaseId)) {
      throw new Error("staging 與 production 必須設定 NEXT_PUBLIC_RELEASE_ID。");
    }
  }

  return {
    apiBaseUrl: normalizedApiUrl,
    appEnvironment,
    releaseId,
    siteUrl: normalizedSiteUrl,
    supabaseAnonKey,
    supabaseUrl: normalizedSupabaseUrl,
  };
}

function parseEnvironment(value: string | undefined): AdminAppEnvironment {
  const result = environmentSchema.safeParse(value?.trim() || "local");
  if (!result.success) {
    throw new Error("NEXT_PUBLIC_APP_ENV 必須是 local、staging 或 production。");
  }
  return result.data;
}

function normalizeUrl(value: string, variableName: string): string {
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${variableName} 必須是有效的絕對 URL。`);
  }
}

function assertRemoteHttpsUrl(value: string, variableName: string): void {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "0.0.0.0" ||
    url.hostname === "::1"
  ) {
    throw new Error(`${variableName} 在 staging 與 production 必須是非本機 HTTPS URL。`);
  }
}

function isPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.length < 12 || isLiteralPlaceholder(normalized);
}

function isLiteralPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.startsWith("replace-with-") ||
    normalized.includes("placeholder") ||
    normalized === "example"
  );
}
