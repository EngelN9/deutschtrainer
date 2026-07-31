export interface AdminPublicConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
}

export function readAdminPublicConfig(): AdminPublicConfig | undefined {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseAnonKey.startsWith("replace-with-") ||
    !apiBaseUrl
  ) {
    return undefined;
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    apiBaseUrl,
  };
}
