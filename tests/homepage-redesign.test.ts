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

test("brand covers the Caribbean while the calculator stays Antigua-specific", () => {
  for (const path of [
    "components/demo-homepage.tsx",
    "app/layout.tsx",
    "components/site-footer.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /Caribbean/i, path);
    assert.match(source, /Antigua/i, path);
    assert.match(source, /Dominica/i, path);
  }
  assert.doesNotMatch(read("components/demo-homepage.tsx"), /For homes in <strong>Antigua/);
});

test("regional homepage keeps calculator and contact while root uses its own entry page", () => {
  const root = read("app/page.tsx");
  const regional = read("components/regional-homepage.tsx");
  const home = read("components/demo-homepage.tsx");
  assert.match(root, /<CaribbeanHomepage/);
  assert.match(regional, /contactSlot={<HomepageContact\s*\/>}/);
  assert.doesNotMatch(root + regional + home, /createClient|supabase-auth|getClaims/);
  assert.match(home, /<AntiguaSolarCalculator country={country}\s*\/>/);
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
  assert.match(home, /Antigua and Dominica/);
  for (const label of [
    "Designed for Island Conditions",
    "Certified Equipment",
    "Local Parts Stock",
    "Reliable Inverter Support",
    "Dependable Solar Panel Support",
  ]) {
    assert.ok(home.includes(label));
  }
  assert.match(
    home,
    /<SiteHeader\s+homeSectionsLocal\s+accountSlot={accountSlot}/,
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
