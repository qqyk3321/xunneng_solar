import { createAuthHandler } from "@/lib/auth-protection/handler";
import { checkLocalAuthLimit } from "@/lib/auth-protection/limiter";
import { performSupabaseAction } from "@/lib/auth-protection/supabase-action";
import { createClient } from "@/lib/supabase-auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createAuthHandler({
  enabled: process.env.NODE_ENV === "development",
  origin: process.env.SITE_URL ?? "",
  checkLimit: checkLocalAuthLimit,
  perform: async (input, origin) => {
    // Instantiated only AFTER rate limiting. SSR writes auth/PKCE cookies using
    // the existing server client; Supabase remains responsible for credentials.
    return performSupabaseAction(await createClient(), input, origin);
  },
});
