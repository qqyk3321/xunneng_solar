import test from "node:test";
import assert from "node:assert/strict";
import { parsePreferences } from "../lib/cookie-preferences";
test("cookie preference parsing preserves explicit rejections and rejects bad data", () => {
  assert.deepEqual(
    parsePreferences('{"version":1,"analytics":false,"marketing":false}'),
    { analytics: false, marketing: false },
  );
  assert.deepEqual(
    parsePreferences('{"version":1,"analytics":true,"marketing":true}'),
    { analytics: true, marketing: true },
  );
  for (const raw of [
    null,
    "",
    "bad",
    '{"version":2,"analytics":true,"marketing":true}',
    '{"version":1,"analytics":"false","marketing":true}',
  ])
    assert.equal(parsePreferences(raw), null);
});
