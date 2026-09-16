import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("why choose us preserves the anchor, scoped claims and readable counter fallback", () => {
  const source = readFileSync("components/why-choose-us.tsx", "utf8");
  const animation = readFileSync("components/animated-stat-value.tsx", "utf8");
  assert.match(source, /id="benefits"/);
  assert.match(
    readFileSync("components/demo-homepage.tsx", "utf8"),
    /<WhyChooseUs country={country}\s*\/>/,
  );
  for (const phrase of [
    "100% local",
    "UL/CE-certified",
    "8-year",
    "15-year",
    "remote monitoring",
    "cleaning and reinforcement",
    "150+ MPH",
    "compatible existing generator",
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
  assert.match(animation, /useState\(value\)/);
  assert.match(animation, /requestAnimationFrame/);
  assert.match(animation, /cancelAnimationFrame/);
  assert.match(animation, /observer.disconnect/);
  assert.match(animation, /prefers-reduced-motion/);
  assert.match(animation, /aria-hidden="true" data-animated-value/);
});
