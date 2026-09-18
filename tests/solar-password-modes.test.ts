import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { accessCookieMode, accessCookieValue, passwordAccessMode, pwaPasswordIsValid, pwaCookieValue, pwaCookieIsValid } from "../app/solar-analysis/access";
import { beforeSendAnalytics } from "../lib/web-analytics";

test("password modes use separate validated cookies; old audited sessions survive", () => {
  assert.equal(passwordAccessMode(process.env.SOLAR_ANALYSIS_PASSWORD || "solortide2026"), "audited");
  assert.equal(passwordAccessMode(process.env.SOLAR_PRIVATE_PASSWORD || "qqyk3321"), "private");
  assert.equal(passwordAccessMode("incorrect"), null);
  assert.equal(accessCookieMode(accessCookieValue()), "audited");
  assert.equal(accessCookieMode(accessCookieValue("private")), "private");
  assert.equal(accessCookieMode("private"), null);
  assert.equal(accessCookieMode(pwaCookieValue()), null);
  assert.equal(pwaCookieIsValid(accessCookieValue("private")), false);
  assert.equal(pwaCookieIsValid(accessCookieValue()), false);
  assert.equal(pwaCookieIsValid(pwaCookieValue()), true);
  assert.equal(pwaPasswordIsValid(process.env.SOLAR_ANALYSIS_PASSWORD || "solortide2026"), false);
  assert.equal(pwaPasswordIsValid(process.env.SOLAR_PRIVATE_PASSWORD || "qqyk3321"), true);
});

test("web calculator exposes no PWA download button or link; app has no trackers", () => {
  const calculator = readFileSync("app/solar-analysis/solar-analysis-client.tsx", "utf8");
  assert.doesNotMatch(calculator, /OfflineTools|href="\/pwa|离线使用/);
  for (const path of ["app/pwa/page.tsx", "app/pwa/app/page.tsx"]) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /SolarVisitTracker|AuthorizedSolarAnalytics/);
  }
  const layout = readFileSync("app/layout.tsx", "utf8");
  assert.match(layout, /site-analytics-gate/);
  for (const path of ["/pwa", "/pwa/app"]) {
    assert.equal(beforeSendAnalytics({ type: "pageview", url: "https://www.solortide.com" + path }, true), null);
  }
});
