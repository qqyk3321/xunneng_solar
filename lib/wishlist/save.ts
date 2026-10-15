import type { SupabaseClient } from "@supabase/supabase-js";
import type { WishlistPayload } from "../island-wishlist";

/** An insert and its pending email audit are atomic via the database trigger. */
export async function saveWishlist(payload: WishlistPayload, client: SupabaseClient, url: string, key: string, fetcher: typeof fetch = fetch) {
  const { data, error } = await client.from("island_wishlist").upsert({
    email: payload.email, island_code: payload.islandCode, other_island: payload.otherIsland,
  }, { onConflict: "email,island_code,other_island", ignoreDuplicates: true }).select("id").maybeSingle();
  if (error) throw new Error("wishlist_database_write_failed");
  // A duplicate registration must not send again, including after provider failures.
  if (!data) return;
  try {
    const response = await fetcher(new URL("/functions/v1/wishlist-confirmation", url), {
      method: "POST", headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ wishlistId: data.id }), signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error("dispatch_rejected");
  } catch {
    // Registration remains successful. Never overwrite an audit claimed by the worker.
    try {
      const { error: auditError } = await client.from("wishlist_confirmation_emails").update({
        status: "unknown", error_code: "dispatch_unconfirmed", completed_at: new Date().toISOString(),
      }).eq("wishlist_id", data.id).eq("status", "pending");
      if (auditError) throw auditError;
    } catch {
      console.error(JSON.stringify({ event: "wishlist_email_audit_update_failed" }));
    }
  }
}
