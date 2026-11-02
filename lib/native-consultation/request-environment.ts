import "server-only";
import { isIP } from "node:net";
import { userAgent } from "next/server";

export function requestEnvironment(request: Request, env: NodeJS.ProcessEnv = process.env) {
  // Only a known edge that overwrites this header is trusted. A direct Node
  // Request has no socket IP; never turn a caller-supplied header into evidence.
  const forwarded = env.VERCEL === "1" ? (request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for"))?.split(",")[0].trim() : undefined;
  const ip = forwarded && isIP(forwarded) ? forwarded : null;
  const header = (name: string, max: number) => {
    if (!ip) return null;
    const value = request.headers.get(name);
    if (!value || value.length > max * 3) return null;
    try {
      const decoded = decodeURIComponent(value).trim();
      return decoded.length <= max && decoded.length > 0 && !/[\u0000-\u001f\u007f]/.test(decoded) ? decoded : null;
    } catch { return null; }
  };
  const country = header("x-vercel-ip-country", 2);
  const region = header("x-vercel-ip-country-region", 12);
  const timezone = header("x-vercel-ip-timezone", 100);
  const ipGeo = ip ? {
    source: "vercel" as const,
    countryCode: country && /^[A-Z]{2}$/.test(country) ? country : null,
    regionCode: region && /^[A-Z0-9-]+$/i.test(region) ? region : null,
    city: header("x-vercel-ip-city", 160),
    timezone: timezone && /^[A-Za-z0-9_+./-]+$/.test(timezone) ? timezone : null,
  } : null;
  const raw = (request.headers.get("user-agent") || "").slice(0, 1024);
  const parsed = userAgent({ headers: new Headers({ "user-agent": raw }) });
  return {
    ip, ipSource: ip ? "vercel" : "unavailable", ipGeo, userAgent: raw || null,
    browser: parsed.browser.name || null, browserVersion: parsed.browser.version || null,
    os: parsed.os.name || null, osVersion: parsed.os.version || null,
    device: parsed.isBot ? "bot" : parsed.device.type || (parsed.os.name ? "desktop" : "unknown"),
  };
}
export type RequestEnvironment = ReturnType<typeof requestEnvironment>;
