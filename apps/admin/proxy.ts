import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { readAdminPublicConfig } from "./src/lib/adminPublicConfig";

export async function proxy(request: NextRequest) {
  const config = readAdminPublicConfig();
  let response = NextResponse.next({ request });

  if (config) {
    const client = createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // This refreshes the cookie-backed session. Authorization remains in the
    // /admin Server Component and in the database/RPC policies.
    await client.auth.getUser();
  }

  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "same-origin");
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
