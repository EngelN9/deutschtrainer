import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readAdminPublicConfig } from "./adminPublicConfig";

export async function createAdminServerClient() {
  const config = readAdminPublicConfig();
  if (!config) {
    return undefined;
  }

  const cookieStore = await cookies();
  return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
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
          // Server Components cannot always write response cookies. The root proxy
          // performs token refresh and persists any updated auth cookies.
        }
      },
    },
  });
}
