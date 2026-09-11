import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("installation journey is independent of the reserved system guide", () => {
  const installation = readFileSync("components/solar-installation.tsx", "utf8");
  const home = readFileSync("components/demo-homepage.tsx", "utf8");
  const header = readFileSync("components/site-header.tsx", "utf8");
  assert.match(installation, /id="solar-installation"/);
  assert.match(home, /<SolarInstallation\s*\/>/);
  assert.doesNotMatch(home, /THE CONSULTATION PROCESS|id="how-it-works"/);
  assert.doesNotMatch(header, /homeLink\("how-it-works"|href=".*how-it-works/);
  assert.doesNotMatch(header, /How it works|navReserved/);
  assert.ok(header.indexOf('homeLink("contact-us"') < header.indexOf('href="/faq"'));
  for (const phrase of [
    "Your Solar Installation in Antigua",
    "Within 48 hours",
    "Around 2–4 days",
    "Typically 1–2 days",
    "Watch Your Bill Drop",
    "satellite data",
    "With your agreement",
    "approve the final plan",
  ])
    assert.ok(installation.includes(phrase));
  assert.match(installation, /observer.disconnect\(\)/);
  assert.match(installation, /prefers-reduced-motion/);
  assert.match(installation, /<AssessmentLink/);
});
