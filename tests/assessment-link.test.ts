import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("content assessment CTAs share orange styling while header and footer stay independent", () => {
  for (const file of [
    "components/demo-homepage.tsx",
    "components/antigua-solar-calculator.tsx",
    "components/solar-installation.tsx",
    "app/faq/faq-directory.tsx",
  ]) {
    assert.match(readFileSync(file, "utf8"), /<AssessmentLink/);
  }
  for (const file of [
    "components/site-header.tsx",
    "components/site-footer.tsx",
  ]) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /AssessmentLink/);
  }
  const component = readFileSync("components/assessment-link.tsx", "utf8");
  assert.ok(component.includes('href={regionPath(country, "/consultation")}'));
  assert.match(component, /prefetch={false}/);
  const css = readFileSync("components/assessment-link.module.css", "utf8");
  assert.match(css, /background: #fea619/);
  assert.match(css, /color: #422600/);
  assert.match(css, /prefers-reduced-motion/);
});
