import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isSupabaseAuthConfigured,
  supabasePublicUrl,
  supabasePublishableKey,
} from "@/lib/supabase-auth/config";

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // The action handler must rate-limit BEFORE contacting Supabase, including
  // any token refresh triggered by cookies from the incoming request.
  if (request.nextUrl.pathname === "/auth-preview/action") return response;

  if (!isSupabaseAuthConfigured()) {
    return response;
  }

  const supabase = createServerClient(supabasePublicUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  // getClaims verifies the token and refreshes it when required. Do not replace
  // this with getSession for server-side authorization decisions.
  await supabase.auth.getClaims();

  return response;
}
