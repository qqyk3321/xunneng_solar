import assert from "node:assert/strict";
import test from "node:test";
import {
  emailFilter,
  loadAccountSubmissions,
} from "../lib/account-submissions/server";
import {
  formatSubmissionTime,
  sortSubmissions,
  submissionLocation,
  submissionPreviewHref,
} from "../lib/account-submissions/model";

const verified = {
  id: "user-1",
  email: "Owner+Test@Example.test",
  email_confirmed_at: "2026-09-08T00:00:00Z",
};
const record = (id: number, email = "owner+test@example.test") => ({
  id: String(id),
  email,
  received_at: "2026-09-08T09:00:00Z",
  location_json: { address: "Test island" },
  submission_id: "AbCd123",
  response_id: "EfGh456",
  respondent_id: "IjKl789",
  payload: { secret: "must never be sent to client" },
});
type Dependencies = Parameters<typeof loadAccountSubmissions>[0];
function dependencies(overrides: Partial<Dependencies> = {}): Dependencies {
  return {
    getUser: async () => ({ data: { user: verified }, error: null }),
    url: "https://project.example.test",
    authUrl: "https://project.example.test",
    serviceKey: "test-only-key",
    fetcher: async () => Response.json([]),
    ...overrides,
  };
}

test("signed-out and unverified users never reach the privileged database read", async () => {
  let reads = 0;
  const fetcher: typeof fetch = async () => {
    reads++;
    return Response.json([]);
  };
  for (const user of [
    null,
    { ...verified, email_confirmed_at: undefined },
    { ...verified, is_anonymous: true },
    { ...verified, email: undefined },
  ]) {
    const result = await loadAccountSubmissions(
      dependencies({
        fetcher,
        getUser: async () => ({ data: { user }, error: null }),
      }),
    );
    assert.equal(result.kind, user ? "verify-email" : "signed-out");
  }
  assert.equal(reads, 0);
});

test("auth service failure is not an empty list; expired session asks for sign-in", async () => {
  for (const [error, kind] of [
    [{ status: 503 }, "error"],
    [{ name: "AuthSessionMissingError" }, "signed-out"],
    [{ status: 401 }, "signed-out"],
  ] as const) {
    const result = await loadAccountSubmissions(
      dependencies({ getUser: async () => ({ data: { user: null }, error }) }),
    );
    assert.equal(result.kind, kind);
  }
});

test("reads ALL batches, even if REST returns fewer than the requested page size", async () => {
  let calls = 0;
  const result = await loadAccountSubmissions(
    dependencies({
      fetcher: async (input, init) => {
        const url = new URL(String(input));
        assert.equal(
          url.searchParams.get("email"),
          emailFilter(verified.email.toLowerCase()),
        );
        assert.equal(url.searchParams.get("id"), `gt.${calls * 2}`);
        assert.equal(url.searchParams.get("order"), "id.asc");
        assert.equal(
          url.searchParams.get("select")?.includes("payload"),
          false,
        );
        assert.equal(init?.cache, "no-store");
        assert.ok(init?.signal);
        calls++;
        return Response.json(
          calls <= 3 ? [record(calls * 2 - 1), record(calls * 2)] : [],
        );
      },
    }),
  );
  assert.equal(calls, 4);
  assert.equal(result.kind, "ready");
  if (result.kind !== "ready") return;
  assert.equal(result.rows.length, 6);
  assert.equal(result.email, "owner+test@example.test");
  assert.equal(
    result.rows[0].previewHref,
    "/submission-preview-test?id=AbCd123EfGh456IjKl789",
  );
  assert.deepEqual(Object.keys(result.rows[0]).sort(), [
    "id",
    "location",
    "previewHref",
    "receivedAt",
  ]);
});

test("case differences match, but another owner's record fails closed", async () => {
  let call = 0;
  const matching = await loadAccountSubmissions(
    dependencies({
      fetcher: async () =>
        Response.json(call++ ? [] : [record(1, "OWNER+TEST@EXAMPLE.TEST")]),
    }),
  );
  assert.equal(matching.kind, "ready");
  const foreign = await loadAccountSubmissions(
    dependencies({
      fetcher: async () => Response.json([record(1, "other@example.test")]),
    }),
  );
  assert.deepEqual(foreign, { kind: "error" });
});

test("zero matches is a genuine empty result", async () => {
  assert.deepEqual(await loadAccountSubmissions(dependencies()), {
    kind: "ready",
    email: "owner+test@example.test",
    rows: [],
  });
});

test("a failed later batch does not return a misleading partial list", async () => {
  let calls = 0;
  const result = await loadAccountSubmissions(
    dependencies({
      fetcher: async () =>
        calls++
          ? new Response("private failure", { status: 500 })
          : Response.json([record(1)]),
    }),
  );
  assert.deepEqual(result, { kind: "error" });
});

test("malformed responses and stalled cursors stop safely", async () => {
  for (const body of [
    { error: "bad" },
    [record(0)],
    [{ ...record(1), id: "invalid" }],
  ]) {
    assert.deepEqual(
      await loadAccountSubmissions(
        dependencies({ fetcher: async () => Response.json(body) }),
      ),
      { kind: "error" },
    );
  }
  let calls = 0;
  assert.deepEqual(
    await loadAccountSubmissions(
      dependencies({
        fetcher: async () => {
          calls++;
          return Response.json([record(1)]);
        },
      }),
    ),
    { kind: "error" },
  );
  assert.equal(calls, 2);
});

test("missing secrets or mismatched projects do not query", async () => {
  let calls = 0;
  for (const override of [
    { serviceKey: undefined },
    { authUrl: "https://another.example.test" },
  ]) {
    const result = await loadAccountSubmissions(
      dependencies({
        ...override,
        fetcher: async () => {
          calls++;
          return Response.json([]);
        },
      }),
    );
    assert.deepEqual(result, { kind: "error" });
  }
  assert.equal(calls, 0);
});

test("email metacharacters are literal and anchored, not search patterns", () => {
  for (const email of [
    "a+b@example.test",
    "a.*_%@example.test",
    "a[1](x)?@example.test",
    "a\\b@example.test",
  ]) {
    const expression = new RegExp(
      emailFilter(email).slice("imatch.".length),
      "i",
    );
    assert.ok(expression.test(email.toUpperCase()));
    assert.equal(expression.test("prefix" + email), false);
    assert.equal(expression.test(email + "suffix"), false);
  }
});

test("preview links use all three IDs in the existing order; incomplete IDs are not linked", () => {
  assert.equal(
    submissionPreviewHref(["AbCd123", "EfGh456", "IjKl789"]),
    "/submission-preview-test?id=AbCd123EfGh456IjKl789",
  );
  for (const ids of [
    ["AbCd123", null, "IjKl789"],
    ["../test", "EfGh456", "IjKl789"],
    ["AbCd123", "EfGh456"],
  ])
    assert.equal(submissionPreviewHref(ids), null);
});

test("location and date fallbacks handle missing or old data without inventing details", () => {
  assert.equal(submissionLocation({ address: " Island A " }), "Island A");
  assert.equal(submissionLocation('{"address":"Island B"}'), "Island B");
  assert.equal(submissionLocation({ lat: 0, lng: 0 }), "0.00000, 0.00000");
  assert.equal(submissionLocation({ lat: null, lng: null }), null);
  assert.equal(submissionLocation({ lat: 999, lng: 10 }), null);
  assert.equal(formatSubmissionTime("bad-date"), "Time unavailable");
  assert.match(formatSubmissionTime("2026-09-08T09:00:00Z"), /UTC$/);
});

test("sorts the full collection by date or location, not just the visible page", () => {
  const rows = Array.from({ length: 45 }, (_, i) => ({
    id: String(i + 1),
    receivedAt: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
    location: `Island ${45 - i}`,
    previewHref: null,
  }));
  assert.equal(
    sortSubmissions(rows, { column: "receivedAt", direction: "desc" })[0].id,
    "45",
  );
  assert.equal(
    sortSubmissions(rows, { column: "receivedAt", direction: "asc" })[0].id,
    "1",
  );
  assert.equal(
    sortSubmissions(rows, { column: "location", direction: "asc" })[0].id,
    "45",
  );
  assert.equal(rows[0].id, "1");
});
