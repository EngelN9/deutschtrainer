import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { readAdminPublicConfig } from "./src/lib/adminPublicConfig";

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export async function proxy(request: NextRequest) {
  // Public pages need the security headers but must stay cacheable, and they have no session to
  // refresh, so they skip the Supabase round trip and the private no-store policy below.
  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return withSecurityHeaders(NextResponse.next({ request }));
  }

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
  // Public pages were previously excluded entirely, so they shipped without security headers.
  // Static assets and image optimisation are left out; they need no session and no headers here.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
