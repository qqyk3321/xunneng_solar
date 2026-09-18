import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { beforeSendAnalytics, isAnalyticsPath } from "../lib/web-analytics";

test("analytics includes only home, regional homes and consultation pages", () => {
  for (const path of ["/", "/antigua", "/dominica", "/consultation", "/antigua/consultation", "/dominica/consultation"]) {
    assert.equal(isAnalyticsPath(path), true);
    assert.deepEqual(beforeSendAnalytics({ type: "pageview", url: `https://www.solortide.com${path}` }), { type: "pageview", url: `https://www.solortide.com${path}` });
  }
});

test("excluded paths, including nested lookalikes and sensitive links, never produce events", () => {
  for (const path of [null, "/faq", "/privacy", "/antigua/faq", "/dominica/privacy", "/solar-analysis", "/solar-analysis/visit", "/antigua/submission/secret", "/submission-preview-test", "/test-pages", "/unknown", "/consultation/private", "/antigua-other", "/dominica/consultation/secret"]) {
    assert.equal(isAnalyticsPath(path), false);
    if (path !== null) assert.equal(beforeSendAnalytics({ type: "pageview", url: `https://www.solortide.com${path}?token=secret` }), null);
  }
});

test("analytics removes all query/hash data and does not mutate the original event", () => {
  const event = { type: "pageview" as const, url: "https://www.solortide.com/antigua/consultation?email=private&token=secret&utm_source=test#secret" };
  assert.deepEqual(beforeSendAnalytics(event), { type: "pageview", url: "https://www.solortide.com/antigua/consultation" });
  assert.ok(event.url.includes("secret"));
});

test("custom events and malformed URLs are silently discarded", () => {
  assert.equal(beforeSendAnalytics({ type: "event", url: "https://www.solortide.com/" }), null);
  for (const url of ["bad-url", "/", "javascript:alert(1)", "file:///consultation"]) {
    assert.equal(beforeSendAnalytics({ type: "pageview", url }), null);
  }
});

test("solar analytics requires an explicitly authorized render and cannot expand other routes", () => {
  const event = { type: "pageview" as const, url: "https://www.solortide.com/solar-analysis?error=invalid_password#private" };
  assert.equal(beforeSendAnalytics(event), null);
  assert.equal(beforeSendAnalytics(event, false), null);
  assert.deepEqual(beforeSendAnalytics(event, true), { type: "pageview", url: "https://www.solortide.com/solar-analysis" });
  for (const path of ["/solar-analysis/visit", "/solar-analysis/private", "/faq", "/antigua/submission/secret"]) {
    assert.equal(beforeSendAnalytics({ type: "pageview", url: `https://www.solortide.com${path}` }, true), null);
  }
  assert.equal(beforeSendAnalytics({ type: "event", url: event.url }, true), null);
});

test("integration is production-only, server-gated and never reads auth cookies in the browser", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");
  const component = readFileSync("components/site-analytics.tsx", "utf8");
  assert.ok(!layout.startsWith('"use client"'));
  assert.match(layout, /process\.env\.VERCEL_ENV === "production" && <SiteAnalytics \/>/);
  assert.match(component, /if \(!isAnalyticsPath\(pathname\)\) return null/);
  assert.match(component, /beforeSend=\{beforeSendBrowserAnalytics\}/);
  assert.match(component, /window\.location\.pathname === "\/solar-analysis"/);
  assert.match(component, /document\.querySelector\('\[data-solar-analytics="authorized"\]'\)/);
  const page = readFileSync("app/solar-analysis/page.tsx", "utf8");
  const authorizedBranch = page.slice(page.indexOf("if (mode)"), page.indexOf("const { error }"));
  assert.match(authorizedBranch, /process\.env\.VERCEL_ENV === "production" && <AuthorizedSolarAnalytics \/>/);
  assert.doesNotMatch(page.slice(page.indexOf("const { error }")), /AuthorizedSolarAnalytics/);
  assert.doesNotMatch(component, /document\.cookie|localStorage|sessionStorage|supabase|accessCookie/);
});
