import { createBrowserClient } from "@supabase/ssr";
import {
  isSupabaseAuthConfigured,
  supabasePublicUrl,
  supabasePublishableKey,
} from "@/lib/supabase-auth/config";

export function createClient() {
  if (!isSupabaseAuthConfigured()) {
    throw new Error(
      "Supabase Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return createBrowserClient(supabasePublicUrl, supabasePublishableKey);
}
