import assert from "node:assert/strict";
import test from "node:test";
import { isKnocketWidgetPath, isPrivateSupportPath } from "../lib/knocket-widget";

test("Knocket is limited to the public website and excludes private quotation URLs", () => {
  for (const path of ["/", "/privacy", "/antigua", "/dominica/", "/antigua/faq", "/dominica/how-it-works", "/antigua/consultation"]) {
    assert.equal(isKnocketWidgetPath(path), true, path);
  }
  for (const path of [null, "", "/antigua/submission/private-token", "/dominica/submission/private-token", "/api/contact", "/test-pages", "/pwa", "/unknown", "/antigua/faq/unknown"]) {
    assert.equal(isKnocketWidgetPath(path), false, String(path));
  }
});

test("Private assessment support is isolated and limited to result pages", () => {
  for (const path of ["/antigua/submission/token", "/dominica/submission/token/"]) {
    assert.equal(isPrivateSupportPath(path), true);
    assert.equal(isKnocketWidgetPath(path), false);
  }
  for (const path of [null, "/antigua", "/antigua/consultation", "/api/consultations/token", "/antigua/submission/token/edit"]) assert.equal(isPrivateSupportPath(path), false);
});
