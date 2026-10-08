import "server-only";

import { isIP } from "node:net";
import { accessCookieMode } from "@/app/solution-suggest/access";
import { isContactOrigin } from "@/lib/anonymous-inquiry/origin";

type Environment = Record<string, string | undefined>;
export type SolarVisit = {
  id: string;
  page_path: "/solution-suggest";
  ip_address: string | null;
  user_agent: string;
  environment: "production" | "preview" | "development";
};

export function solarVisitDetails(id: string, headers: Headers, env: Environment): SolarVisit {
  // As elsewhere in this app, do not trust client-supplied forwarding headers
  // on a local/non-Vercel server. No fake IP is substituted when unavailable.
  const forwarded = env.VERCEL === "1"
    ? headers.get("x-forwarded-for")?.split(",")[0].trim()
    : undefined;
  return {
    id,
    page_path: "/solution-suggest",
    ip_address: forwarded && isIP(forwarded) ? forwarded : null,
    user_agent: (headers.get("user-agent") ?? "").replace(/\0/g, "").slice(0, 1024),
    environment: env.VERCEL_ENV === "preview" ? "preview"
      : env.VERCEL_ENV === "production" || env.NODE_ENV === "production" ? "production"
      : "development",
  };
}

/** Exactly one REST insert, with a bounded timeout and no SDK/HTTP retries. */
export async function saveSolarVisit(
  visit: SolarVisit,
  env: Environment = process.env,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const url = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return;
  try {
    const response = await fetcher(`${url.replace(/\/$/, "")}/rest/v1/solution_suggest_access_logs?on_conflict=id`, {
      method: "POST",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(3000),
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify(visit),
    });
    // Success/failure is deliberately not exposed to the page. No retry, read
    // back, error-row insertion or logging of secrets/IP/UA on failure.
    await response.body?.cancel();
  } catch {
    // Access to the analysis must never depend on logging availability.
  }
}

async function readVisitId(request: Request): Promise<string | null> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return null;
  if (Number(request.headers.get("content-length") ?? 0) > 512) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  let text = "";
  let size = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 512) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(part.value, { stream: true });
    }
    text += decoder.decode();
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    const id = (body as Record<string, unknown>).id;
    if (Object.keys(body).length !== 1 || typeof id !== "string") return null;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function handleSolarVisit(
  request: Request,
  cookie: string | undefined,
  { env = process.env, save = saveSolarVisit }: {
    env?: Environment;
    save?: (visit: SolarVisit, env: Environment) => Promise<void>;
  } = {},
) {
  const respond = (status: number) => new Response(null, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
  if (request.method !== "POST") return respond(405);
  const mode = accessCookieMode(cookie);
  if (!mode) return respond(401);
  // Enforce on the server too: private sessions must never reach the insert,
  // even if an old tab or a manually constructed request posts to this endpoint.
  if (mode === "private") return respond(204);
  const localOrigin = env.NODE_ENV === "development" &&
    request.headers.get("origin") === new URL(request.url).origin;
  const originEnv = { ...env, SITE_URL: env.SITE_URL || "https://www.solortide.com" };
  if ((!isContactOrigin(request, originEnv) && !localOrigin) ||
      request.headers.get("sec-fetch-site") === "cross-site") return respond(403);
  const id = await readVisitId(request);
  if (!id) return respond(400);
  try {
    await save(solarVisitDetails(id, request.headers, env), env);
  } catch {
    // The page's fire-and-forget request stays successful even if storage fails.
  }
  return respond(204);
}
