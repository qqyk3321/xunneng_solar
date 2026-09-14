import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  acknowledgeIntake,
  PRIVACY_VERSION,
  SERVICE_COUNTRIES,
} from "../lib/consultation-intake";
import { isTestRoute } from "../lib/test-pages/access";

test("intake requires acknowledgement and an available service country", () => {
  for (const country of ["", "other", "DO", "__proto__"]) {
    assert.equal(acknowledgeIntake(country, true), null);
  }
  for (const country of ["AG", "DM"]) {
    assert.equal(acknowledgeIntake(country, false), null);
    const result = acknowledgeIntake(country, true)!;
    assert.equal(result.country, country);
    assert.equal(result.privacyVersion, PRIVACY_VERSION);
    assert.ok(Number.isFinite(Date.parse(result.acknowledgedAt)));
  }
  assert.equal(SERVICE_COUNTRIES.DM.label, "Dominica");
  assert.notDeepEqual(SERVICE_COUNTRIES.AG.center, SERVICE_COUNTRIES.DM.center);
});

test("consultation gates third-party UI and carries acknowledgement in the existing payload", () => {
  const source = readFileSync("components/consultation-flow.tsx", "utf8");
  assert.match(source, /useState<Step>\("intake"\)/);
  assert.match(source, /step === "location" && intake/);
  assert.match(source, /step === "form" && selectedPlace/);
  assert.match(source, /privacyAcknowledgement:/);
  assert.match(source, /serviceCountry: intake.country/);
  assert.match(
    source,
    /url.searchParams.set\("location_json", place.locationJson\)/,
  );
  assert.doesNotMatch(source, /sessionStorage|localStorage/);
});

test("cookie demo is local-only and not a functioning consent manager", () => {
  assert.equal(isTestRoute("/test-pages/cookie-preview"), true);
  const page = readFileSync("app/test-pages/cookie-preview/page.tsx", "utf8");
  assert.match(page, /process.env.NODE_ENV !== "development"/);
  const preview = readFileSync(
    "app/test-pages/cookie-preview/preview.tsx",
    "utf8",
  );
  assert.doesNotMatch(
    preview,
    /document.cookie|localStorage|sessionStorage|fetch\(/,
  );
  assert.match(preview, /No cookies, tracking or services were changed/);
  assert.match(preview, /showModal\(\)/);
});
