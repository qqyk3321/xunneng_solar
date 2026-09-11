import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  isSupabaseAuthConfigured,
  supabasePublicUrl,
  supabasePublishableKey,
} from "@/lib/supabase-auth/config";

export async function createClient() {
  if (!isSupabaseAuthConfigured()) {
    throw new Error(
      "Supabase Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabasePublicUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. The route-scoped middleware
          // refreshes and persists the session before these components render.
        }
      },
    },
  });
}
