import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("homepage sections omit the four removed eyebrow labels", () => {
  const source = [
    "components/demo-homepage.tsx",
    "components/why-choose-us.tsx",
    "components/solar-installation.tsx",
    "components/home-contact.tsx",
    "components/homepage-contact.tsx",
  ]
    .map(read)
    .join("\n");
  assert.doesNotMatch(
    source,
    /START WITH YOUR ELECTRICITY BILL|WHY CHOOSE US|YOUR INSTALLATION JOURNEY|A CONVERSATION STARTS HERE/,
  );
});

test("site branding consistently refers to Antigua", () => {
  for (const path of [
    "components/demo-homepage.tsx",
    "app/layout.tsx",
    "components/site-footer.tsx",
    "app/auth-preview/layout.tsx",
    "app/submission-preview-test/page.tsx",
    "lib/faq/content.ts",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /caribbean|加勒比/i, path);
    assert.match(source, /Antigua/i, path);
  }
  assert.match(read("components/demo-homepage.tsx"), /for Antigua/);
});

test("root homepage composes the calculator and contact without adding authentication", () => {
  const root = read("app/page.tsx");
  const home = read("components/demo-homepage.tsx");
  assert.match(root, /contactSlot={<HomepageContact\s*\/>}/);
  assert.doesNotMatch(root + home, /createClient|supabase-auth|getClaims/);
  assert.match(home, /<AntiguaSolarCalculator\s*\/>/);
  const calculator = read("components/antigua-solar-calculator.tsx");
  assert.match(calculator, /<AssessmentLink/);
  assert.doesNotMatch(calculator, /contactHref|SectionAnchor/);
  assert.ok(home.indexOf('id="calculator"') < home.indexOf("<WhyChooseUs"));
  assert.ok(home.indexOf("<WhyChooseUs") < home.indexOf("<SolarInstallation"));
  assert.ok(home.indexOf("<SolarInstallation") < home.indexOf("{contactSlot}"));
  assert.doesNotMatch(
    home,
    /Service Areas Across the Caribbean|Zero Friction Deployment|99\.9%|Cat-5 Rated|No outages/,
  );
  assert.match(home, /APUA June 2026/);
  for (const label of [
    "150+ MPH Rated",
    "UL Certified Equipment",
    "Local Parts Stock",
    "10-Year Inverter + Battery Warranty",
    "25-Year Solar Panel Warranty",
  ]) {
    assert.ok(home.includes(label));
  }
  assert.match(
    home,
    /<SiteHeader homeSectionsLocal accountSlot={accountSlot}/,
    "Existing preview can still supply its account menu",
  );
});

test("contact integration is public while the legacy preview write remains local", () => {
  const integration = read("components/homepage-contact.tsx");
  const route = read("app/home-preview/contact/route.ts");
  assert.match(integration, /return <HomeContact variant={variant}/);
  assert.doesNotMatch(integration, /NODE_ENV|AssessmentLink/);
  assert.match(read("app/api/contact/route.ts"), /enabled: true/);
  assert.match(read("components/home-contact.tsx"), /fetch\("\/api\/contact"/);
  assert.match(route, /enabled: process\.env\.NODE_ENV === "development"/);
  assert.doesNotMatch(integration, /SERVICE_ROLE|saveInquiry|\.storage\./);
});

test("same-page anchors respect reduced motion and sticky navigation", () => {
  const anchor = read("components/section-anchor.tsx");
  const css = read("components/demo-homepage.module.css");
  assert.match(anchor, /prefers-reduced-motion: reduce/);
  assert.match(anchor, /preventScroll: true/);
  assert.match(anchor, /window\.history\.pushState/);
  assert.match(css, /scroll-margin-top: 104px/);
  assert.match(css, /scroll-margin-top: 92px/);
});
