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
    "Local stock and support in Antigua.",
    "Support for your Dominica home.",
    "-certified equipment with LiFePO4 storage",
    "remote monitoring",
    "cleaning and reinforcement",
    "compatible solar, battery, grid and generator integration",
    "Systems installed",
    "Bill savings potential",
    "Payback period",
    "Response time",
  ])
    assert.ok(source.includes(phrase), phrase);
  assert.match(source, /country === "AG" \? "UL" : country === "DM" \? "CE"/);
  assert.match(source, /country === "DM"\s*\?/);
  assert.doesNotMatch(
    source,
    /complimentary|free maintenance|uninterrupted|guaranteed savings|warrant|island conditions|150\+? MPH|\d+[- ]year|4,?000 cycles/i,
  );
  assert.match(animation, /useState\(value\)/);
  assert.match(animation, /requestAnimationFrame/);
  assert.match(animation, /cancelAnimationFrame/);
  assert.match(animation, /observer.disconnect/);
  assert.match(animation, /prefers-reduced-motion/);
  assert.match(animation, /aria-hidden="true" data-animated-value/);
});
