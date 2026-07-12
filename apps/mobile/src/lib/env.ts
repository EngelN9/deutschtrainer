export const mobileEnv = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8787",
  contentSource: process.env.EXPO_PUBLIC_CONTENT_SOURCE === "supabase" ? "supabase" : "mock",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "replace-with-local-anon-key",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
} as const;
