import assert from "node:assert/strict";
import test from "node:test";
import { isKnocketWidgetPath } from "../lib/knocket-widget";

test("Knocket is limited to the public website and excludes private quotation URLs", () => {
  for (const path of ["/", "/privacy", "/antigua", "/dominica/", "/antigua/faq", "/dominica/how-it-works", "/antigua/consultation"]) {
    assert.equal(isKnocketWidgetPath(path), true, path);
  }
  for (const path of [null, "", "/antigua/submission/private-token", "/dominica/submission/private-token", "/api/contact", "/test-pages", "/pwa", "/unknown", "/antigua/faq/unknown"]) {
    assert.equal(isKnocketWidgetPath(path), false, String(path));
  }
});
