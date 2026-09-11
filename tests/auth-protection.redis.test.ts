import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import {
  createPolicyLimiters,
  emailIdentifier,
  enforcePolicies,
} from "../lib/auth-protection/limiter";
import { createAuthHandler } from "../lib/auth-protection/handler";

// Explicitly invoked by test:auth:redis. Real Redis, mocked authentication:
// no Supabase traffic, real accounts, email sends, or deletes.
const redis = Redis.fromEnv({
  retry: false,
  signal: () => AbortSignal.timeout(8000),
});
const secret = process.env.UPSTASH_REDIS_REST_TOKEN!;
const origin = "http://192.168.1.176:3003";
function prefix() {
  return "xunneng:auth-preview:local:test:" + randomUUID();
}

test("real Redis: 10 login attempts pass, the 11th stops before auth, a new instance stays blocked", async () => {
  const scope = prefix();
  let limiters = createPolicyLimiters(redis, scope);
  let authCalls = 0;
  const handler = createAuthHandler({
    enabled: true,
    origin,
    checkLimit: (action, email) =>
      enforcePolicies(limiters, action, email, secret),
    perform: async () => {
      authCalls++;
      return { error: { status: 400, code: "invalid_credentials" } };
    },
  });
  const invoke = (extra: Record<string, string> = {}) =>
    handler(
      new Request(origin + "/auth-preview/action", {
        method: "POST",
        headers: { origin, "content-type": "application/json", ...extra },
        body: JSON.stringify({
          action: "sign-in",
          email: "rate-test@example.test",
          password: "not-a-real-password",
        }),
      }),
    );
  for (let i = 0; i < 10; i++) assert.equal((await invoke()).status, 401);
  const denied = await invoke();
  assert.equal(denied.status, 429);
  assert.ok(Number(denied.headers.get("retry-after")) > 0);
  assert.equal(authCalls, 10);
  limiters = createPolicyLimiters(redis, scope);
  assert.equal(
    (
      await invoke({
        "x-forwarded-for": "203.0.113.42",
        cookie: "fake=other-browser",
      })
    ).status,
    429,
  );
  assert.equal(authCalls, 10);
});

test("real Redis: signup, reset and resend share cooldown; only first mock email is sent", async () => {
  const scope = prefix();
  const limiters = createPolicyLimiters(redis, scope);
  let mockEmails = 0;
  const handler = createAuthHandler({
    enabled: true,
    origin,
    checkLimit: (action, email) =>
      enforcePolicies(limiters, action, email, secret),
    perform: async () => {
      mockEmails++;
      return { authenticated: false };
    },
  });
  for (const [action, expected] of [
    ["sign-up", 200],
    ["forgot", 429],
    ["resend", 429],
  ] as const) {
    const response = await handler(
      new Request(origin + "/auth-preview/action", {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify({
          action,
          email: "Shared@Example.test",
          password: "test-password",
          confirmation: "test-password",
        }),
      }),
    );
    assert.equal(response.status, expected);
  }
  assert.equal(mockEmails, 1);
  const key =
    scope + ":mailCooldown:" + emailIdentifier("shared@example.test", secret);
  const ttl = await redis.pttl(key);
  assert.ok(
    ttl > 0 && ttl <= 60000,
    "shared email cooldown expires automatically",
  );
  assert.equal(key.includes("@"), false);
});

test("real Redis: sixth registration is blocked even with a different mailbox", async () => {
  const limiters = createPolicyLimiters(redis, prefix());
  for (let i = 0; i < 5; i++) {
    assert.equal(
      (
        await enforcePolicies(
          limiters,
          "sign-up",
          "register-" + i + "@example.test",
          secret,
        )
      ).allowed,
      true,
    );
  }
  assert.equal(
    (
      await enforcePolicies(
        limiters,
        "sign-up",
        "register-6@example.test",
        secret,
      )
    ).allowed,
    false,
  );
});

test("real Redis: simultaneous requests share an atomic cooldown; automatic expiry restores access", async () => {
  const scope = prefix();
  const limiters = createPolicyLimiters(redis, scope);
  // Only this isolated test substitutes a short interval. There is no HTTP flag
  // or production configuration to shorten/bypass the real 60-second cooldown.
  limiters.mailCooldown = new Ratelimit({
    redis,
    prefix: scope + ":short-cooldown",
    limiter: Ratelimit.tokenBucket(1, "3 s", 1),
    timeout: 8000,
    analytics: false,
    ephemeralCache: false,
  });
  const results = await Promise.all(
    Array.from({ length: 4 }, () =>
      enforcePolicies(limiters, "forgot", "concurrent@example.test", secret),
    ),
  );
  assert.equal(results.filter((r) => r.allowed).length, 1);
  await delay(3200);
  assert.equal(
    (
      await enforcePolicies(
        limiters,
        "forgot",
        "concurrent@example.test",
        secret,
      )
    ).allowed,
    true,
  );
});

test("real Redis: hourly email cap remains even when cooldown is already satisfied", async () => {
  const limiters = createPolicyLimiters(redis, prefix());
  // Isolate the hourly rule without waiting five minutes. The production
  // limiter and Redis window remain unchanged.
  limiters.mailCooldown = {
    limit: async () => ({
      success: true,
      reset: 0,
      pending: Promise.resolve(),
    }),
  };
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await enforcePolicies(limiters, "resend", "hourly@example.test", secret))
        .allowed,
      true,
    );
  assert.equal(
    (await enforcePolicies(limiters, "forgot", "hourly@example.test", secret))
      .allowed,
    false,
  );
});
