import { NextResponse } from "next/server";
import { isSupabaseAuthConfigured } from "@/lib/supabase-auth/config";
import { createClient } from "@/lib/supabase-auth/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV !== "development")
    return new NextResponse(null, { status: 404 });
  if (!isSupabaseAuthConfigured()) {
    return NextResponse.json(
      { authenticated: false, error: "Supabase Auth is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  return NextResponse.json(
    {
      authenticated: Boolean(claims?.sub),
      user: claims?.sub
        ? {
            id: claims.sub,
            email: typeof claims.email === "string" ? claims.email : null,
          }
        : null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
