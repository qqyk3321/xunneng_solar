import assert from "node:assert/strict";
import test from "node:test";
import { beforeSendSpeedInsights, isSpeedInsightsPath } from "../lib/speed-insights";

test("performance monitoring includes public pages in both regions", () => {
  assert.equal(isSpeedInsightsPath("/"), true);
  assert.equal(isSpeedInsightsPath("/privacy"), true);
  for (const prefix of ["/antigua", "/dominica"]) {
    for (const suffix of ["", "/consultation", "/faq", "/how-it-works"]) {
      assert.equal(isSpeedInsightsPath(`${prefix}${suffix}` || "/"), true);
    }
  }
});

test("staff, internal and unknown routes cannot send performance data", () => {
  for (const path of ["/consultation", "/faq", "/how-it-works", "/antigua/privacy", "/dominica/privacy", "/antigua/submission", "/dominica/submission/token/extra", "/submission-preview-test", "/quote-settings", "/solar-analysis", "/test-pages", "/api/contact", "/staff", "/unknown"]) {
    assert.equal(isSpeedInsightsPath(path), false);
    assert.equal(beforeSendSpeedInsights({ type: "vital", url: `https://www.solortide.com${path}` }), null);
  }
  assert.equal(isSpeedInsightsPath(null), false);
  assert.equal(beforeSendSpeedInsights({ type: "vital", url: "invalid" }), null);
});

test("submission performance groups by region without tokens in URLs or route metadata", () => {
  for (const region of ["antigua", "dominica"]) {
    for (const token of ["private-token_A123", "another-token_B456"]) {
      const path = `/${region}/submission/${token}`;
      assert.equal(isSpeedInsightsPath(path), true);
      assert.deepEqual(beforeSendSpeedInsights({
        type: "vital",
        url: `https://user:password@www.solortide.com${path}/?token=${token}#${token}`,
        route: path,
      }), {
        type: "vital",
        url: `https://www.solortide.com/${region}/submission`,
        route: `/${region}/submission`,
      });
    }
  }
  assert.equal(beforeSendSpeedInsights({ type: "vital", url: "ftp://example.com/antigua" }), null);
});

test("performance events redact URL details and retain separate regional routes", () => {
  assert.deepEqual(beforeSendSpeedInsights({
    type: "vital",
    url: "https://name:password@www.solortide.com/dominica?email=private@example.com#token",
    route: "/[region]",
  }), { type: "vital", url: "https://www.solortide.com/dominica", route: "/dominica" });
});
