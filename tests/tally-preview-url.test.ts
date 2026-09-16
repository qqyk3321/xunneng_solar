import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tallyPreviewUrl } from "../lib/tally-preview-url";
test("preview iframe only accepts the HTTPS Tally origin without credentials", () => {
  assert.equal(tallyPreviewUrl("https://tally.so/example?token=test"), "https://tally.so/example?token=test");
  for (const value of [null, "", "javascript:alert(1)", "http://tally.so/x", "https://tally.so.evil.test/x", "https://user:password@tally.so/x", "https://tally.so:444/x"]) assert.equal(tallyPreviewUrl(value), null);
});

test("submission preview loads the iframe without the Tally embed runtime", () => {
  const source = readFileSync("components/submission-preview-frame.tsx", "utf8");
  assert.match(source, /preconnect\("https:\/\/tally\.so"\)/);
  assert.match(source, /loading="eager"/);
  assert.doesNotMatch(source, /widgets\/embed\.js|next\/script|dynamicHeight/);
});
