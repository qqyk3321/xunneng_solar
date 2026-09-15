import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { receiveSubmission, type SubmissionRow } from "./intake.ts";

Deno.serve((req: Request) =>
  receiveSubmission(
    req,
    (name) => Deno.env.get(name),
    async (row: SubmissionRow) => {
      const url = Deno.env.get("SUPABASE_URL"),
        key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!url || !key) throw new Error("Storage is not configured");
      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) =>
            fetch(input, { ...init, signal: AbortSignal.timeout(7000) }),
        },
      });
      const { error } = await client.from("tally_form_submissions").insert(row);
      if (!error) return { duplicate: false };
      if (error.code === "23505") {
        const existing = await client
          .from("tally_form_submissions")
          .select("id")
          .eq("form_id", row.form_id)
          .eq("submission_id", row.submission_id)
          .maybeSingle();
        if (!existing.error && existing.data) return { duplicate: true };
      }
      throw new Error("Submission storage failed");
    },
  ),
);
