import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createAdminServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey.startsWith("replace-with-")) {
    return undefined;
  }

  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot always mutate cookies. proxy.ts refreshes
          // the session and writes refreshed cookies to the outgoing response.
        }
      },
    },
  });
}
