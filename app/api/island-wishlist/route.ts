import { createClient } from "@supabase/supabase-js";
import { createWishlistHandler } from "@/lib/island-wishlist";
import { isContactOrigin } from "@/lib/anonymous-inquiry/origin";
import { checkContactLimit } from "@/lib/anonymous-inquiry/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createWishlistHandler({
  origin: (request) => isContactOrigin(request, process.env),
  limit: (request) => checkContactLimit(request, "wishlist"),
  save: async (payload) => {
    const url = process.env.SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !key) throw new Error("missing_database_configuration");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }),
      },
    });
    const { error } = await client.from("island_wishlist").upsert(
      {
        email: payload.email,
        island_code: payload.islandCode,
        other_island: payload.otherIsland,
      },
      { onConflict: "email,island_code,other_island", ignoreDuplicates: true },
    );
    if (error) throw new Error("wishlist_database_write_failed");
  },
  // Never log emails, request bodies, credentials or upstream error messages.
  onError: () =>
    console.error(
      JSON.stringify({
        event: "island_wishlist_failed",
        reason: "dependency_error",
      }),
    ),
});
