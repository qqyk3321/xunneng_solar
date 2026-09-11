import assert from "node:assert/strict";
import { test } from "node:test";
import { createServerClient } from "@supabase/ssr";
import {
  createAuthHandler,
  type AuthOutcome,
} from "../lib/auth-protection/handler";
import {
  emailIdentifier,
  enforcePolicies,
  type PolicyLimiters,
} from "../lib/auth-protection/limiter";
import {
  AUTH_ACTIONS,
  POLICY_RULES,
  type AuthInput,
  type PolicyName,
} from "../lib/auth-protection/policy";
import { performSupabaseAction } from "../lib/auth-protection/supabase-action";

const origin = "http://192.168.1.176:3003";
const input = {
  action: "sign-in",
  email: " Person@Example.test ",
  password: "password-for-test",
};
function request(body: unknown = input, headers: Record<string, string> = {}) {
  return new Request(origin + "/auth-preview/action", {
    method: "POST",
    headers: { origin, "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
function setup(
  overrides: Partial<Parameters<typeof createAuthHandler>[0]> = {},
) {
  const calls: string[] = [];
  let received: AuthInput | undefined;
  const handler = createAuthHandler({
    enabled: true,
    origin,
    checkLimit: async () => {
      calls.push("limit");
      return { allowed: true, retryAfter: 0 };
    },
    perform: async (value) => {
      calls.push("auth");
      received = value;
      return { authenticated: true };
    },
    ...overrides,
  });
  return { handler, calls, received: () => received };
}

test("only calls Supabase after a successful limit check; normalizes email", async () => {
  const s = setup();
  const response = await s.handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(s.calls, ["limit", "auth"]);
  assert.equal(s.received()?.email, "person@example.test");
  assert.deepEqual(await response.json(), { authenticated: true });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("429 never calls auth and returns Retry-After", async () => {
  const s = setup({
    checkLimit: async () => ({ allowed: false, retryAfter: 37 }),
  });
  const response = await s.handler(request());
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "37");
  assert.deepEqual(s.calls, []);
  assert.equal((await response.json()).retryAfter, 37);
});

test("Redis outage fails closed without leaking errors or submitting credentials", async () => {
  const s = setup({
    checkLimit: async () => {
      throw new Error("PRIVATE-TOKEN");
    },
  });
  const response = await s.handler(request());
  assert.equal(response.status, 503);
  assert.deepEqual(s.calls, []);
  assert.equal((await response.text()).includes("PRIVATE-TOKEN"), false);
});

test("prototype is disabled outside local development", async () => {
  const s = setup({ enabled: false });
  assert.equal((await s.handler(request())).status, 404);
  assert.deepEqual(s.calls, []);
});

test("rejects foreign/missing origins and ignores spoofed forwarded host", async () => {
  const headerCases: Record<string, string>[] = [
    { origin: "https://attacker.test" },
    { origin: "", "x-forwarded-host": "192.168.1.176:3003" },
    { origin, "sec-fetch-site": "cross-site" },
  ];
  for (const headers of headerCases) {
    const s = setup();
    assert.equal((await s.handler(request(input, headers))).status, 403);
    assert.deepEqual(s.calls, []);
  }
});

test("validates action, email, password and signup confirmation before services", async () => {
  for (const body of [
    null,
    [],
    {},
    { ...input, action: "admin" },
    { ...input, email: "bad" },
    { ...input, password: "" },
    { ...input, password: "a".repeat(1025) },
    { ...input, action: "sign-up", confirmation: "mismatch" },
    { ...input, action: "sign-up", password: "short", confirmation: "short" },
  ]) {
    const s = setup();
    assert.equal((await s.handler(request(body))).status, 400);
    assert.deepEqual(s.calls, []);
  }
});

test("rejects wrong content type, malformed JSON and oversized streamed bodies", async () => {
  const s = setup();
  assert.equal(
    (await s.handler(request(input, { "content-type": "text/plain" }))).status,
    415,
  );
  assert.equal(
    (
      await s.handler(
        new Request(origin + "/auth-preview/action", {
          method: "POST",
          headers: { origin, "content-type": "application/json" },
          body: "{",
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (await s.handler(request({ ...input, extra: "a".repeat(5000) }))).status,
    413,
  );
  assert.deepEqual(s.calls, []);
});

test("login accepts existing passwords shorter than signup minimum", async () => {
  assert.equal(
    (await setup().handler(request({ ...input, password: "old" }))).status,
    200,
  );
});

test("maps provider errors without exposing identity, raw messages or tokens", async () => {
  const outcomes: [AuthOutcome, number][] = [
    [{ error: { code: "invalid_credentials", status: 400 } }, 401],
    [{ error: { status: 429 } }, 429],
    [{ error: { status: 503 } }, 503],
  ];
  for (const [outcome, status] of outcomes) {
    const response = await setup({ perform: async () => outcome }).handler(
      request(),
    );
    assert.equal(response.status, status);
  }
  for (const action of ["forgot", "resend", "sign-up"]) {
    const response = await setup({
      perform: async () => ({
        error: { code: "user_already_exists", status: 422 },
      }),
    }).handler(request({ ...input, action, confirmation: input.password }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { authenticated: false });
  }
});

test("provider network failure returns generic 503", async () => {
  const response = await setup({
    perform: async () => {
      throw new Error("secret-body");
    },
  }).handler(request());
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes("secret-body"), false);
});

function fakePolicies(
  onLimit: (
    name: PolicyName,
    id: string,
  ) => {
    success: boolean;
    reset: number;
    reason?: string;
  },
): PolicyLimiters {
  return Object.fromEntries(
    Object.keys(POLICY_RULES).map((name) => [
      name,
      {
        limit: async (id: string) => ({
          ...onLimit(name as PolicyName, id),
          pending: Promise.resolve(),
        }),
      },
    ]),
  ) as PolicyLimiters;
}

test("email HMAC is stable, case-normalized, private and key-dependent", () => {
  const id = emailIdentifier(" Person@Example.test ", "unit-private-key");
  assert.equal(id, emailIdentifier("person@example.test", "unit-private-key"));
  assert.match(id, /^[a-f0-9]{64}$/);
  assert.notEqual(id, emailIdentifier("person@example.test", "different-key"));
});

test("source is fixed; registration/recovery/resend share email policies", async () => {
  const recorded: [PolicyName, string][] = [];
  const policies = fakePolicies((name, id) => {
    recorded.push([name, id]);
    return { success: true, reset: Date.now() + 1000 };
  });
  for (const action of AUTH_ACTIONS)
    await enforcePolicies(policies, action, input.email, "key");
  const sourceCalls = recorded.filter(([name]) => name.endsWith("Source"));
  assert.ok(sourceCalls.every(([, id]) => id === "local-test-source"));
  assert.equal(recorded.filter(([name]) => name === "mailCooldown").length, 3);
  const emailCalls = recorded.filter(([name]) => !name.endsWith("Source"));
  assert.ok(
    emailCalls.every(([, id]) => id === emailIdentifier(input.email, "key")),
  );
});

test("SDK success=true on timeout is still denied", async () => {
  const policies = fakePolicies(() => ({
    success: true,
    reset: 0,
    reason: "timeout",
  }));
  await assert.rejects(
    () => enforcePolicies(policies, "sign-in", input.email, "key"),
    /timed out/,
  );
});

test("stops at first denied policy; minimum retry delay is one second", async () => {
  let checks = 0;
  const policies = fakePolicies(() => {
    checks++;
    return { success: false, reset: Date.now() - 1000 };
  });
  const decision = await enforcePolicies(
    policies,
    "forgot",
    input.email,
    "key",
  );
  assert.deepEqual(decision, { allowed: false, retryAfter: 1 });
  assert.equal(checks, 1);
});

test("Supabase SDK adapter writes session cookies and keeps tokens out of handler JSON", async () => {
  const jar = new Map<string, string>();
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const accessToken = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(JSON.stringify({ sub: "test-user-id", exp: expiry })).toString(
      "base64url",
    ),
    "not-a-real-signature",
  ].join(".");
  const client = createServerClient(
    "https://unit-auth.invalid",
    "public-unit-key",
    {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (cookies) => {
          for (const c of cookies) jar.set(c.name, c.value);
        },
      },
      global: {
        fetch: async (url) => {
          assert.match(String(url), /\/auth\/v1\/token\?grant_type=password/);
          return Response.json({
            access_token: accessToken,
            refresh_token: "unit-refresh-secret",
            token_type: "bearer",
            expires_in: 3600,
            expires_at: expiry,
            user: {
              id: "test-user-id",
              email: "person@example.test",
              aud: "authenticated",
              created_at: new Date().toISOString(),
            },
          });
        },
      },
    },
  );
  const s = setup({
    perform: (value, redirect) =>
      performSupabaseAction(client, value, redirect),
  });
  const response = await s.handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authenticated: true });
  assert.ok([...jar.keys()].some((key) => key.includes("auth-token")));
  assert.ok([...jar.values()].some((value) => value.startsWith("base64-")));
});

test("SDK email actions use the configured callback and persist PKCE cookies; no real emails", async () => {
  for (const action of ["sign-up", "forgot", "resend"] as const) {
    const jar = new Map<string, string>();
    const calls: URL[] = [];
    const client = createServerClient(
      "https://unit-auth.invalid",
      "public-unit-key",
      {
        cookies: {
          getAll: () => [...jar].map(([name, value]) => ({ name, value })),
          setAll: (cookies) => {
            for (const c of cookies) jar.set(c.name, c.value);
          },
        },
        global: {
          fetch: async (url) => {
            calls.push(new URL(String(url)));
            return Response.json(
              action === "sign-up"
                ? {
                    id: "test-user-id",
                    email: "person@example.test",
                    identities: [],
                    created_at: new Date().toISOString(),
                  }
                : {},
            );
          },
        },
      },
    );
    await performSupabaseAction(
      client,
      { action, email: "person@example.test", password: "unit-password" },
      origin,
    );
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].searchParams.get("redirect_to"),
      origin +
        "/auth-preview/confirm?next=/auth-preview" +
        (action === "forgot" ? "/update-password" : ""),
    );
    if (action !== "resend")
      assert.ok([...jar.keys()].some((key) => key.includes("code-verifier")));
  }
});
