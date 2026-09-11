import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  contactFailureLog,
  ContactFailure,
  dependencyFailure,
} from "../lib/anonymous-inquiry/diagnostics";
import { createContactHandler } from "../lib/anonymous-inquiry/contact-handler";
import { textDocument } from "../lib/anonymous-inquiry/rich-text";

test("public route correlates a real missing-config failure with a private log and response header", async () => {
  const keys = [
    "NODE_ENV",
    "SITE_URL",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
  ];
  const previous = keys.map((key) => process.env[key]);
  const originalLogger = console.error;
  const logs: string[] = [];
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      SITE_URL: "https://diagnostic.example",
    });
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    console.error = (message: string) => {
      logs.push(message);
    };
    const { POST } = await import("../app/api/contact/route");
    const response = await POST(
      new Request("https://diagnostic.example/api/contact", {
        method: "POST",
        headers: { origin: "https://diagnostic.example" },
      }),
    );
    assert.equal(response.status, 503);
    assert.equal(logs.length, 1);
    const log = JSON.parse(logs[0]);
    assert.equal(log.stage, "upstash.config");
    assert.equal(log.reason, "missing_configuration");
    assert.equal(log.configured.upstashToken, false);
    assert.match(
      response.headers.get("x-contact-request-id")!,
      /^[0-9a-f-]{36}$/,
    );
    assert.equal(log.requestId, response.headers.get("x-contact-request-id"));
    assert.doesNotMatch(
      await response.text(),
      /upstash|configuration|supabase/,
    );
  } finally {
    console.error = originalLogger;
    keys.forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    });
  }
});

test("diagnostics classify dependency failures without retaining secrets or personal data", () => {
  const error = {
    status: 401,
    message:
      "Unauthorized token secret-123 from user@example.com https://private.example",
    code: "PGRST301",
    details: "private message",
  };
  const failure = dependencyFailure("supabase.lookup", error);
  const log = contactFailureLog(failure, "generated-reference", {
    SUPABASE_SERVICE_ROLE_KEY: "secret-123",
    UPSTASH_REDIS_REST_TOKEN: "another-secret",
  });
  assert.equal(log.stage, "supabase.lookup");
  assert.equal(log.reason, "credentials_or_permissions");
  assert.equal(log.providerCode, "PGRST301");
  assert.equal(log.providerStatus, 401);
  assert.equal(log.configured.supabaseServiceRoleKey, true);
  assert.doesNotMatch(
    JSON.stringify(log),
    /secret-123|another-secret|user@|private\.example|private message/,
  );
  assert.equal(
    dependencyFailure("upstash.limit", new Error("fetch failed")).reason,
    "network",
  );
  assert.equal(
    dependencyFailure("upstash.limit", new Error("timed out")).reason,
    "timeout",
  );
  assert.equal(
    contactFailureLog(
      new ContactFailure("upstash.config", "missing_configuration"),
      "id",
      {},
    ).configured.upstashToken,
    false,
  );
});

test("handler reports the failure once and preserves a generic 503 response", async () => {
  const failure = new ContactFailure("upstash.limit", "timeout");
  let logged = 0;
  const handler = createContactHandler({
    enabled: true,
    origin: "https://example.com",
    beforeRead: async () => {
      throw failure;
    },
    save: async () => {
      throw new Error("must not save");
    },
    onError: (error) => {
      assert.equal(error, failure);
      logged++;
    },
  });
  const response = await handler(
    new Request("https://example.com/api/contact", {
      method: "POST",
      headers: { origin: "https://example.com" },
    }),
  );
  assert.equal(response.status, 503);
  assert.equal(logged, 1);
  assert.doesNotMatch(await response.text(), /upstash|timeout|must not save/);
});

test("storage phase is logged and logger errors do not break the friendly response", async () => {
  const data = new FormData();
  data.set("email", "test@example.com");
  data.set("requestId", randomUUID());
  data.set("website", "");
  data.set("format", "plain");
  data.set("content", JSON.stringify(textDocument("Please help with solar")));
  const handler = createContactHandler({
    enabled: true,
    origin: "https://example.com",
    save: async () => {
      throw new ContactFailure("supabase.insert", "dependency_error");
    },
    onError: () => {
      throw new Error("logger offline");
    },
  });
  const response = await handler(
    new Request("https://example.com/api/contact", {
      method: "POST",
      headers: { origin: "https://example.com" },
      body: data,
    }),
  );
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /logger offline|supabase/);
});
