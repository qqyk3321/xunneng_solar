import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("why choose us preserves the anchor, scoped claims and readable counter fallback", () => {
  const source = readFileSync("components/why-choose-us.tsx", "utf8");
  assert.match(source, /id="benefits"/);
  assert.match(
    readFileSync("components/demo-homepage.tsx", "utf8"),
    /<WhyChooseUs\s*\/>/,
  );
  for (const phrase of [
    "100% local",
    "UL-certified",
    "10-year",
    "25 years",
    "remote monitoring",
    "cleaning and reinforcement",
    "150+ MPH",
    "without burning a drop of fuel",
    "Illustrative count",
    "Up to",
    "Target: within",
    "not guarantees",
  ])
    assert.ok(source.includes(phrase), phrase);
  assert.doesNotMatch(
    source,
    /complimentary|free maintenance|uninterrupted|guaranteed savings/i,
  );
  assert.match(source, /useState\(value\)/);
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /cancelAnimationFrame/);
  assert.match(source, /observer.disconnect/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /aria-hidden="true" data-animated-value/);
});
