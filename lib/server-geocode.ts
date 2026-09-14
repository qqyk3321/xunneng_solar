import "server-only";
import { isContactOrigin } from "./anonymous-inquiry/origin";

type Env = Record<string, string | undefined>;
type Result = {
  place_id?: string;
  formatted_address?: string;
  address_components?: Array<{ long_name: string; types: string[] }>;
  geometry?: {
    location?: { lat: number; lng: number };
    viewport?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
};
export function createGeocodeHandler(
  env: Env,
  requestGoogle: typeof fetch = fetch,
) {
  let active = 0;
  let windowStart = 0;
  let count = 0;
  const reply = (body: unknown, status = 200) =>
    Response.json(body, {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(status === 429 ? { "Retry-After": "60" } : {}),
      },
    });
  return async function POST(request: Request) {
    if (!isContactOrigin(request, env))
      return reply({ error: "Request origin is not allowed." }, 403);
    if (!env.GOOGLE_MAPS_SERVER_KEY)
      return reply({ error: "Address lookup is not configured." }, 503);
    if (Date.now() - windowStart >= 60000) {
      count = 0;
      windowStart = Date.now();
    }
    // Conservative per-process ceiling. Provider quotas remain necessary on serverless.
    if (active >= 2 || count >= 30)
      return reply({ error: "Please try again shortly." }, 429);
    count += 1;
    active += 1;
    try {
      const reader = request.body?.getReader();
      if (!reader) return reply({ error: "An address is required." }, 400);
      let size = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2048) {
          await reader.cancel();
          return reply({ error: "Request too large." }, 413);
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      let body;
      try {
        body = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        return reply({ error: "Invalid request." }, 400);
      }
      if (
        !body ||
        typeof body.address !== "string" ||
        body.address.trim().length < 2 ||
        body.address.length > 500 ||
        !["AG", "DM"].includes(body.country)
      )
        return reply(
          { error: "A valid address and supported country are required." },
          400,
        );
      const query = new URLSearchParams({
        address: body.address.trim(),
        components: `country:${body.country}`,
        key: env.GOOGLE_MAPS_SERVER_KEY,
        language: "en",
      });
      const response = await requestGoogle(
        `https://maps.googleapis.com/maps/api/geocode/json?${query}`,
        { cache: "no-store", signal: AbortSignal.timeout(8000) },
      );
      if (!response.ok)
        return reply(
          { error: "Address lookup is temporarily unavailable." },
          502,
        );
      const payload = (await response.json()) as {
        status?: string;
        results?: Result[];
      };
      if (payload.status === "ZERO_RESULTS") return reply({ results: [] });
      if (payload.status !== "OK")
        return reply(
          { error: "Address lookup is temporarily unavailable." },
          502,
        );
      const results = (payload.results ?? []).slice(0, 5).flatMap((result) => {
        const location = result.geometry?.location;
        if (
          !location ||
          !Number.isFinite(location.lat) ||
          !Number.isFinite(location.lng) ||
          !result.formatted_address
        )
          return [];
        const viewport = result.geometry?.viewport;
        return [
          {
            id: result.place_id ?? `${location.lat},${location.lng}`,
            address: result.formatted_address,
            lat: location.lat,
            lng: location.lng,
            components: result.address_components ?? [],
            ...(viewport
              ? {
                  viewport: {
                    north: viewport.northeast.lat,
                    east: viewport.northeast.lng,
                    south: viewport.southwest.lat,
                    west: viewport.southwest.lng,
                  },
                }
              : {}),
          },
        ];
      });
      return reply({ results });
    } catch {
      return reply(
        { error: "Address lookup is temporarily unavailable." },
        502,
      );
    } finally {
      active -= 1;
    }
  };
}
