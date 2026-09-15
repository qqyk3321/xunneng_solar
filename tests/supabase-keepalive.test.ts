import test from "node:test";
import assert from "node:assert/strict";
import { querySupabaseKeepalive } from "../lib/supabase-keepalive";

const environment = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "server-only-key",
};

test("Supabase keepalive performs one small authenticated read", async () => {
  let calls = 0;
  await querySupabaseKeepalive(environment, async (input, init) => {
    calls += 1;
    const url = new URL(String(input));
    assert.equal(url.pathname, "/rest/v1/tally_form_submissions");
    assert.equal(url.searchParams.get("select"), "id");
    assert.equal(url.searchParams.get("limit"), "1");
    assert.equal(new Headers(init?.headers).get("apikey"), "server-only-key");
    assert.equal(
      new Headers(init?.headers).get("authorization"),
      "Bearer server-only-key",
    );
    return new Response("[]", { status: 200 });
  });
  assert.equal(calls, 1);
});

test("Supabase keepalive rejects missing configuration", async () => {
  await assert.rejects(
    querySupabaseKeepalive({}, async () => new Response("[]")),
    /not configured/,
  );
});

test("Supabase keepalive rejects unsuccessful database responses", async () => {
  await assert.rejects(
    querySupabaseKeepalive(
      environment,
      async () => new Response("unavailable", { status: 503 }),
    ),
    /status 503/,
  );
});
