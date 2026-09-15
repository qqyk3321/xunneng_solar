import test from "node:test";
import assert from "node:assert/strict";
import { tallyPreviewUrl } from "../lib/tally-preview-url";
test("preview iframe only accepts the HTTPS Tally origin without credentials", () => {
  assert.equal(tallyPreviewUrl("https://tally.so/example?token=test"), "https://tally.so/example?token=test");
  for (const value of [null, "", "javascript:alert(1)", "http://tally.so/x", "https://tally.so.evil.test/x", "https://user:password@tally.so/x", "https://tally.so:444/x"]) assert.equal(tallyPreviewUrl(value), null);
});
