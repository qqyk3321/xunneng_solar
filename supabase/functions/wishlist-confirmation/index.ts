import { withSupabase } from "npm:@supabase/server@1.9.1";
import { confirmWishlist } from "./handler.ts";

export default {
  fetch: withSupabase({ auth: "secret:*" }, (req, ctx) =>
    confirmWishlist(req, { client: ctx.supabaseAdmin, env: name => Deno.env.get(name) })),
};
