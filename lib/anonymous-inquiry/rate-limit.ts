import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { InquiryError } from "./handler";
import { ContactFailure } from "./diagnostics";

type LimitResult = {
  success: boolean;
  reset?: number;
  reason?: string;
  pending: Promise<unknown>;
};

export async function requireContactLimit(result: LimitResult) {
  if (result.reason === "timeout") {
    void result.pending.catch(() => undefined);
    throw new InquiryError(
      503,
      "Contact protection timed out.",
    );
  }
  await result.pending;
  if (!result.success)
    throw new InquiryError(
      429,
      "Please try again later.",
      Math.max(
        1,
        Math.ceil(((result.reset ?? Date.now() + 60_000) - Date.now()) / 1000),
      ),
    );
}

let configured:
  { source: Ratelimit; total: Ratelimit; secret: string } | undefined;

export async function checkContactLimit(request: Request) {
  // Local prototypes retain the handler's existing process-local safety ceiling.
  if (process.env.NODE_ENV === "development") return;
  if (!configured) {
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    if (!url || !token)
      throw new ContactFailure("upstash.config", "missing_configuration");
    const redis = new Redis({
      url,
      token,
      retry: false,
      signal: () => AbortSignal.timeout(3500),
    });
    const prefix = `xunneng:contact:v1:${process.env.VERCEL_ENV ?? "production"}`;
    const options = {
      redis,
      timeout: 2500,
      analytics: false,
      enableProtection: false,
    };
    configured = {
      secret: token,
      source: new Ratelimit({
        ...options,
        prefix: `${prefix}:source`,
        limiter: Ratelimit.slidingWindow(5, "10 m"),
      }),
      total: new Ratelimit({
        ...options,
        prefix: `${prefix}:total`,
        limiter: Ratelimit.slidingWindow(100, "1 h"),
      }),
    };
  }
  // Vercel overwrites x-forwarded-for. Other hosts use a shared conservative
  // quota until their trusted proxy configuration is explicitly implemented.
  const forwarded =
    process.env.VERCEL === "1"
      ? request.headers.get("x-forwarded-for")?.split(",")[0].trim()
      : undefined;
  const source = forwarded && isIP(forwarded) ? forwarded : "shared-origin";
  const identifier = createHmac("sha256", configured.secret)
    .update(`xunneng:contact:source:v1\0${source}`)
    .digest("hex");
  await requireContactLimit(await configured.source.limit(identifier));
  await requireContactLimit(await configured.total.limit("all"));
}
