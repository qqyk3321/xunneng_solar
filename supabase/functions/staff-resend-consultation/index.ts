import { withSupabase } from "npm:@supabase/server@1.9.1";
import { resendConsultation } from "./handler.ts";

// This is a server-to-server endpoint. Browser JWTs and publishable/anon keys
// are rejected. The staff server checks the active employee before calling.
export default {
  fetch: withSupabase({ auth: "secret:*" }, (req, ctx) =>
    resendConsultation(req, { client: ctx.supabaseAdmin, env: name => Deno.env.get(name) })),
};
