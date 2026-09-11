import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("header, footer and browser icon share the same local vector mark", () => {
  for (const file of [
    "components/site-header.tsx",
    "components/site-footer.tsx",
  ]) {
    assert.match(readFileSync(file, "utf8"), /<BrandMark\s*\/>/);
  }
  assert.match(
    readFileSync("components/brand-mark.tsx", "utf8"),
    /src="\/icon.svg"/,
  );
  const svg = readFileSync("app/icon.svg", "utf8");
  assert.match(svg, /viewBox="0 0 64 64"/);
  assert.doesNotMatch(svg, /<script|<foreignObject|<image|href=/i);
});
