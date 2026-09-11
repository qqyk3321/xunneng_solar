import "server-only";
import { createHmac } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  ACTION_POLICIES,
  LOCAL_SOURCE,
  POLICY_RULES,
  type AuthAction,
  type LimitDecision,
  type PolicyName,
} from "./policy";

export type PolicyLimiter = {
  limit(identifier: string): Promise<{
    success: boolean;
    reset: number;
    reason?: string;
    pending: Promise<unknown>;
  }>;
};
export type PolicyLimiters = Record<PolicyName, PolicyLimiter>;

export function emailIdentifier(email: string, secret: string) {
  if (!secret) throw new Error("Missing private rate limit key.");
  return createHmac("sha256", secret)
    .update("xunneng:auth-preview:email:v1\0" + email.trim().toLowerCase())
    .digest("hex");
}

export async function enforcePolicies(
  limiters: PolicyLimiters,
  action: AuthAction,
  email: string,
  secret: string,
): Promise<LimitDecision> {
  const identity = emailIdentifier(email, secret);
  for (const policy of ACTION_POLICIES[action]) {
    const identifier = policy.endsWith("Source") ? LOCAL_SOURCE : identity;
    const result = await limiters[policy].limit(identifier);
    // The SDK deliberately fails OPEN on timeout. Auth must instead fail closed.
    // Do not await its still-running Redis request on the timeout path.
    if (result.reason === "timeout") {
      void result.pending.catch(() => undefined);
      throw new Error("Rate limit service timed out.");
    }
    await result.pending;
    if (!result.success) {
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
      };
    }
  }
  return { allowed: true, retryAfter: 0 };
}

export function createPolicyLimiters(
  redis: Redis,
  prefix: string,
): PolicyLimiters {
  if (!prefix.startsWith("xunneng:auth-preview:local:")) {
    throw new Error("Only isolated local rate limit prefixes are permitted.");
  }
  const limiters = {} as PolicyLimiters;
  for (const name of Object.keys(POLICY_RULES) as PolicyName[]) {
    const rule = POLICY_RULES[name];
    limiters[name] = new Ratelimit({
      redis,
      prefix: prefix + ":" + name,
      limiter:
        rule.algorithm === "bucket"
          ? Ratelimit.tokenBucket(1, rule.window, rule.count)
          : Ratelimit.slidingWindow(rule.count, rule.window),
      timeout: 2500,
      analytics: false,
      enableProtection: false,
      // SDK's local cache only caches denials; it cannot grant extra requests.
    });
  }
  return limiters;
}

let configured: { limiters: PolicyLimiters; secret: string } | undefined;

export async function checkLocalAuthLimit(action: AuthAction, email: string) {
  if (process.env.NODE_ENV !== "development")
    throw new Error("Local preview only.");
  if (!configured) {
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    if (!url || !token) throw new Error("Upstash is not configured.");
    // Domain-separated HMAC uses the existing server-only credential; no new
    // browser-visible secret is required. Rotating it also rotates identifiers.
    const redis = new Redis({
      url,
      token,
      retry: false,
      signal: () => AbortSignal.timeout(3500),
    });
    configured = {
      limiters: createPolicyLimiters(redis, "xunneng:auth-preview:local:v1"),
      secret: token,
    };
  }
  return enforcePolicies(configured.limiters, action, email, configured.secret);
}
