import { z } from "zod";

const publicConfigSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
});

export interface ClassroomPublicConfig {
  apiBaseUrl: string;
  supabaseAnonKey: string;
  supabaseUrl: string;
}

export function readClassroomPublicConfig(
  environment: Record<string, string | undefined>,
): ClassroomPublicConfig {
  const parsed = publicConfigSchema.safeParse(environment);
  if (!parsed.success || parsed.data.VITE_SUPABASE_ANON_KEY.startsWith("replace-with-")) {
    throw new Error(
      "虛擬教室缺少 VITE_API_BASE_URL、VITE_SUPABASE_URL 或有效的 VITE_SUPABASE_ANON_KEY。",
    );
  }
  return {
    apiBaseUrl: parsed.data.VITE_API_BASE_URL.replace(/\/$/, ""),
    supabaseAnonKey: parsed.data.VITE_SUPABASE_ANON_KEY,
    supabaseUrl: parsed.data.VITE_SUPABASE_URL.replace(/\/$/, ""),
  };
}
