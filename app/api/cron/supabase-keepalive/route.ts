import { querySupabaseKeepalive } from "@/lib/supabase-keepalive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const jsonHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    console.error("Supabase keepalive skipped: CRON_SECRET is missing");
    return new Response(JSON.stringify({ ok: false }), {
      status: 503,
      headers: jsonHeaders,
    });
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  try {
    await querySupabaseKeepalive();
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error(
      "Supabase keepalive failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return new Response(JSON.stringify({ ok: false }), {
      status: 502,
      headers: jsonHeaders,
    });
  }
}
