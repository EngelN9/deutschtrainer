import type { ConfigContext, ExpoConfig } from "expo/config";

export interface MobileBuildEnvironment {
  DEUTSCHTRAINER_BUILD_PROFILE?: string;
  EXPO_PUBLIC_API_BASE_URL?: string;
  EXPO_PUBLIC_CONTENT_SOURCE?: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
  EXPO_PUBLIC_SUPABASE_URL?: string;
}

export function assertMobileReleaseConfig(environment: MobileBuildEnvironment): void {
  if (environment.DEUTSCHTRAINER_BUILD_PROFILE?.trim() !== "production") {
    return;
  }

  if (environment.EXPO_PUBLIC_CONTENT_SOURCE?.trim() !== "api") {
    throw new Error("Production Mobile build requires EXPO_PUBLIC_CONTENT_SOURCE=api.");
  }

  assertRemoteHttpsUrl("EXPO_PUBLIC_API_BASE_URL", environment.EXPO_PUBLIC_API_BASE_URL);
  assertRemoteHttpsUrl("EXPO_PUBLIC_SUPABASE_URL", environment.EXPO_PUBLIC_SUPABASE_URL);

  const anonKey = environment.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!anonKey || anonKey.startsWith("replace-with-")) {
    throw new Error("Production Mobile build requires EXPO_PUBLIC_SUPABASE_ANON_KEY.");
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  assertMobileReleaseConfig({
    DEUTSCHTRAINER_BUILD_PROFILE: process.env.DEUTSCHTRAINER_BUILD_PROFILE,
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_CONTENT_SOURCE: process.env.EXPO_PUBLIC_CONTENT_SOURCE,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  });
  return {
    ...config,
    name: config.name ?? "DeutschTrainer",
    slug: config.slug ?? "deutschtrainer",
  };
};

function assertRemoteHttpsUrl(name: string, value: string | undefined): void {
  let url: URL;
  try {
    url = new URL(value?.trim() ?? "");
  } catch {
    throw new Error(`Production Mobile build requires an absolute ${name}.`);
  }

  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  ) {
    throw new Error(`Production Mobile build requires a remote HTTPS ${name}.`);
  }
}
