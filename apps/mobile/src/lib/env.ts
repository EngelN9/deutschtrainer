const configuredContentSource = process.env.EXPO_PUBLIC_CONTENT_SOURCE;

export type MobileContentSource = "api" | "mock";

export function getMobileCapabilities(contentSource: MobileContentSource) {
  return {
    supportsConnectedAuth: contentSource === "api",
    supportsOfflineDemo: contentSource === "mock",
  } as const;
}

const contentSource: MobileContentSource =
  configuredContentSource === "api" || configuredContentSource === "supabase" ? "api" : "mock";
const capabilities = getMobileCapabilities(contentSource);

export const mobileEnv = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8787",
  contentSource,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "replace-with-local-anon-key",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  ...capabilities,
} as const;
