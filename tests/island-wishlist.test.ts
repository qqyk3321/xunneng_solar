import test from "node:test";
import assert from "node:assert/strict";
import { createWishlistHandler, parseWishlist } from "../lib/island-wishlist";
import { InquiryError } from "../lib/anonymous-inquiry/handler";
import { UPCOMING_ISLANDS } from "../lib/upcoming-islands";

const payload = { email: " Person@Example.com ", islandCode: "BB" };
test("all sixteen planned locations are accepted by the wishlist", () => {
  assert.deepEqual(Object.keys(UPCOMING_ISLANDS), [
    "KN",
    "LC",
    "VC",
    "GD",
    "BB",
    "SX",
    "JM",
    "BM",
    "MS",
    "TC",
    "VG",
    "SABA",
    "BONAIRE",
    "BS",
    "KY",
    "CW",
  ]);
  for (const islandCode of Object.keys(UPCOMING_ISLANDS)) {
    assert.deepEqual(parseWishlist({ ...payload, islandCode }), {
      email: "person@example.com",
      islandCode,
      otherIsland: "",
    });
  }
});
test("wishlist validates and normalizes fields", () => {
  assert.deepEqual(parseWishlist(payload), {
    email: "person@example.com",
    islandCode: "BB",
    otherIsland: "",
  });
  assert.equal(
    parseWishlist({
      ...payload,
      islandCode: "OTHER",
      otherIsland: "  Test   Island ",
    }).otherIsland,
    "test island",
  );
  for (const input of [
    null,
    [],
    {},
    { ...payload, email: "invalid" },
    { ...payload, email: "a".repeat(255) + "@example.com" },
    { ...payload, islandCode: "__proto__" },
    { ...payload, islandCode: "AG" },
    { ...payload, islandCode: "OTHER" },
    { ...payload, islandCode: "OTHER", otherIsland: "<script>" },
  ]) {
    assert.throws(() => parseWishlist(input));
  }
});

const request = (
  body: unknown = payload,
  headers: Record<string, string> = {},
) =>
  new Request("https://example.com/api/island-wishlist", {
    method: "POST",
    headers: {
      origin: "https://example.com",
      "content-type": "application/json",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
test("wishlist gates origin, limits, size and JSON before database writes", async () => {
  let saves = 0;
  const handler = createWishlistHandler({
    origin: (r) => r.headers.get("origin") === "https://example.com",
    limit: async () => {},
    save: async () => {
      saves++;
    },
  });
  assert.equal((await handler(request())).status, 200);
  assert.equal(saves, 1);
  assert.equal(
    (await handler(request(payload, { origin: "https://evil.com" }))).status,
    403,
  );
  assert.equal(
    (await handler(request(payload, { "content-type": "text/plain" }))).status,
    415,
  );
  assert.equal((await handler(request("bad json"))).status, 400);
  assert.equal((await handler(request("x".repeat(4097)))).status, 413);
  assert.equal(
    (await handler(request({ ...payload, islandCode: "bad" }))).status,
    400,
  );
  assert.equal(saves, 1);
});
test("wishlist returns safe failure and retry headers", async () => {
  const handler = createWishlistHandler({
    origin: () => true,
    limit: async () => {
      throw new InquiryError(429, "Try later", 60);
    },
    save: async () => {
      assert.fail("must not save");
    },
  });
  const limited = await handler(request());
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "60");
  const unavailable = createWishlistHandler({
    origin: () => true,
    limit: async () => {},
    save: async () => {
      throw new Error("secret database details");
    },
  });
  const response = await unavailable(request());
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes("secret"));
});
