import { z } from "zod";

export type MobileAppEnvironment = "local" | "preview" | "production";
export type MobileContentSource = "api" | "mock";

export interface MobileEnv {
  apiBaseUrl: string;
  apiRelease: string;
  appEnvironment: MobileAppEnvironment;
  appRelease: string;
  contentRelease: string;
  contentSource: MobileContentSource;
  logLevel: "debug" | "info" | "warn" | "error";
  supabaseAnonKey: string;
  supabaseUrl: string;
}

interface MobilePublicEnvironment {
  EXPO_PUBLIC_API_BASE_URL?: string | undefined;
  EXPO_PUBLIC_API_RELEASE?: string | undefined;
  EXPO_PUBLIC_APP_ENV?: string | undefined;
  EXPO_PUBLIC_APP_RELEASE?: string | undefined;
  EXPO_PUBLIC_CONTENT_RELEASE?: string | undefined;
  EXPO_PUBLIC_CONTENT_SOURCE?: string | undefined;
  EXPO_PUBLIC_LOG_LEVEL?: string | undefined;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string | undefined;
  EXPO_PUBLIC_SUPABASE_URL?: string | undefined;
}

const appEnvironmentSchema = z.enum(["local", "preview", "production"]);
const contentSourceSchema = z.enum(["api", "mock"]);
const logLevelSchema = z.enum(["debug", "info", "warn", "error"]);

export function readMobileEnv(env: MobilePublicEnvironment): MobileEnv {
  const appEnvironment = parseValue(
    appEnvironmentSchema,
    env.EXPO_PUBLIC_APP_ENV?.trim() || "local",
    "EXPO_PUBLIC_APP_ENV",
  );
  const contentSource = parseValue(
    contentSourceSchema,
    env.EXPO_PUBLIC_CONTENT_SOURCE?.trim() || "mock",
    "EXPO_PUBLIC_CONTENT_SOURCE",
  );
  const apiBaseUrl = cleanUrl(
    env.EXPO_PUBLIC_API_BASE_URL,
    "http://localhost:8787",
    "EXPO_PUBLIC_API_BASE_URL",
  );
  const supabaseUrl = cleanUrl(
    env.EXPO_PUBLIC_SUPABASE_URL,
    "http://127.0.0.1:54321",
    "EXPO_PUBLIC_SUPABASE_URL",
  );
  const supabaseAnonKey =
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || "replace-with-local-anon-key";
  const apiRelease = env.EXPO_PUBLIC_API_RELEASE?.trim() || "local";
  const appRelease = env.EXPO_PUBLIC_APP_RELEASE?.trim() || "local";
  const contentRelease = env.EXPO_PUBLIC_CONTENT_RELEASE?.trim() || "local";

  if (appEnvironment !== "local") {
    if (contentSource !== "api") {
      throw new Error("preview 與 production 必須使用 EXPO_PUBLIC_CONTENT_SOURCE=api。");
    }
    assertRemoteHttpsUrl(apiBaseUrl, "EXPO_PUBLIC_API_BASE_URL");
    assertRemoteHttpsUrl(supabaseUrl, "EXPO_PUBLIC_SUPABASE_URL");
    if (isPlaceholder(supabaseAnonKey)) {
      throw new Error("preview 與 production 必須設定有效的 EXPO_PUBLIC_SUPABASE_ANON_KEY。");
    }
    if ([apiRelease, appRelease, contentRelease].some(isReleasePlaceholder)) {
      throw new Error("preview 與 production 必須設定 App、API 與內容 release 識別碼。");
    }
  }

  return {
    apiBaseUrl,
    apiRelease,
    appEnvironment,
    appRelease,
    contentRelease,
    contentSource,
    logLevel: parseValue(
      logLevelSchema,
      env.EXPO_PUBLIC_LOG_LEVEL?.trim() || (appEnvironment === "local" ? "debug" : "warn"),
      "EXPO_PUBLIC_LOG_LEVEL",
    ),
    supabaseAnonKey,
    supabaseUrl,
  };
}

function parseValue<T>(schema: z.ZodType<T>, value: string, variableName: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(`${variableName} 的設定值不受支援。`);
  }
  return result.data;
}

function cleanUrl(value: string | undefined, fallback: string, variableName: string): string {
  const candidate = value?.trim() || fallback;
  try {
    const url = new URL(candidate);
    return url.toString().replace(/\/$/, "");
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
    url.hostname === "10.0.2.2" ||
    url.hostname === "::1"
  ) {
    throw new Error(`${variableName} 在 preview 與 production 必須是非本機 HTTPS URL。`);
  }
}

function isPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length < 20 ||
    normalized.startsWith("replace-with-") ||
    normalized.includes("placeholder") ||
    normalized.includes("example")
  );
}

function isReleasePlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    !normalized ||
    normalized === "local" ||
    normalized.startsWith("replace-with-") ||
    normalized.includes("placeholder") ||
    normalized === "example"
  );
}

// Expo only inlines statically referenced EXPO_PUBLIC_* values. Keep these direct accesses.
export const mobileEnv = readMobileEnv({
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_API_RELEASE: process.env.EXPO_PUBLIC_API_RELEASE,
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_APP_RELEASE: process.env.EXPO_PUBLIC_APP_RELEASE,
  EXPO_PUBLIC_CONTENT_RELEASE: process.env.EXPO_PUBLIC_CONTENT_RELEASE,
  EXPO_PUBLIC_CONTENT_SOURCE: process.env.EXPO_PUBLIC_CONTENT_SOURCE,
  EXPO_PUBLIC_LOG_LEVEL: process.env.EXPO_PUBLIC_LOG_LEVEL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
});
