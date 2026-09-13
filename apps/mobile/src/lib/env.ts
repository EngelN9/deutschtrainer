const configuredContentSource = process.env.EXPO_PUBLIC_CONTENT_SOURCE;
const contentSource =
  configuredContentSource === "api" || configuredContentSource === "supabase" ? "api" : "mock";

export const mobileEnv = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8787",
  // Only controls whether the classroom appears in the navigation. The route itself stays
  // reachable by URL so the deployed build can be verified before the feature is announced, and
  // the API enforces the real gate (CLASSROOM_ENABLED plus a server-side profile allowlist).
  classroomEnabled: process.env.EXPO_PUBLIC_CLASSROOM_ENABLED === "true",
  contentSource,
  // Requires anonymous sign-ins to be enabled on the Supabase project, which this build
  // cannot detect. Opt in explicitly so a build never shows a trial button that only errors.
  guestTrialEnabled:
    contentSource === "api" && process.env.EXPO_PUBLIC_GUEST_TRIAL_ENABLED === "true",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "replace-with-local-anon-key",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
} as const;
