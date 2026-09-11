import test from "node:test";
import assert from "node:assert/strict";
import { createContactHandler } from "../lib/anonymous-inquiry/contact-handler";
import { InquiryError } from "../lib/anonymous-inquiry/handler";
import { textDocument } from "../lib/anonymous-inquiry/rich-text";
import {
  contactOrigins,
  isContactOrigin,
} from "../lib/anonymous-inquiry/origin";
import { requireContactLimit } from "../lib/anonymous-inquiry/rate-limit";

const env = { NODE_ENV: "production", SITE_URL: "https://solar.example" };
function request(origin = env.SITE_URL) {
  const form = new FormData();
  form.set("email", "release-check@example.com");
  form.set("requestId", "4583a8b3-a6a3-435d-b332-bfab81c1fb91");
  form.set("website", "");
  form.set("format", "plain");
  form.set(
    "content",
    JSON.stringify(
      textDocument("Please assess my solar installation.\nThank you."),
    ),
  );
  return new Request("https://internal.example/api/contact", {
    method: "POST",
    body: form,
    headers: {
      origin,
      host: "evil.example",
      "x-forwarded-host": "evil.example",
    },
  });
}

test("production and Vercel Preview accept only configured HTTPS origins", () => {
  assert.deepEqual(contactOrigins(env), [env.SITE_URL]);
  assert.ok(isContactOrigin(request(), env));
  for (const origin of [
    "https://evil.example",
    "null",
    "",
    "http://solar.example",
    "https://solar.example.evil.test",
  ]) {
    assert.equal(isContactOrigin(request(origin), env), false);
  }
  assert.deepEqual(
    contactOrigins({
      NODE_ENV: "production",
      SITE_URL: "http://192.168.1.176:3003",
    }),
    [],
  );
  assert.deepEqual(contactOrigins({ NODE_ENV: "development" }), [
    "http://192.168.1.176:3003",
  ]);
  const vercel = {
    ...env,
    VERCEL: "1",
    VERCEL_ENV: "preview",
    VERCEL_URL: "solar-abc.vercel.app",
    VERCEL_PROJECT_PRODUCTION_URL: "solar.vercel.app",
  };
  assert.ok(isContactOrigin(request("https://solar-abc.vercel.app"), vercel));
  assert.equal(
    isContactOrigin(request("https://other.vercel.app"), vercel),
    false,
  );
  assert.equal(
    isContactOrigin(request("https://solar-abc.vercel.app"), {
      ...vercel,
      VERCEL: "0",
    }),
    false,
  );
});

test("public contact reaches storage only after origin and protection succeed", async () => {
  let saves = 0,
    checks = 0;
  let blocked = false;
  const handler = createContactHandler({
    enabled: true,
    origin: (req) => isContactOrigin(req, env),
    beforeRead: async () => {
      checks++;
      if (blocked) throw new InquiryError(429, "limited");
    },
    save: async (payload) => {
      saves++;
      assert.equal(payload.email, "release-check@example.com");
      assert.match(payload.message, /\nThank you/);
      return { reference: payload.id, receivedAt: new Date().toISOString() };
    },
  });
  assert.equal((await handler(request("https://evil.example"))).status, 403);
  assert.equal(checks, 0);
  assert.equal((await handler(request())).status, 201);
  assert.equal(saves, 1);
  blocked = true;
  const response = await handler(request());
  assert.equal(response.status, 429);
  assert.equal(saves, 1);
  assert.match(response.headers.get("cache-control")!, /no-store/);
  assert.ok(response.headers.has("retry-after"));
});

test("rate limit denials, timeouts and service errors fail closed", async () => {
  await requireContactLimit({ success: true, pending: Promise.resolve() });
  await assert.rejects(
    requireContactLimit({ success: false, pending: Promise.resolve() }),
    (error: unknown) => error instanceof InquiryError && error.status === 429,
  );
  await assert.rejects(
    requireContactLimit({
      success: true,
      reason: "timeout",
      pending: Promise.resolve(),
    }),
    (error: unknown) => error instanceof InquiryError && error.status === 503,
  );
  const handler = createContactHandler({
    enabled: true,
    origin: env.SITE_URL,
    beforeRead: async () => {
      throw new Error("private-service-token");
    },
    save: async () => {
      throw new Error("must not save");
    },
  });
  const response = await handler(request());
  assert.equal(response.status, 503);
  assert.doesNotMatch(
    await response.text(),
    /private-service-token|must not save/,
  );
});
