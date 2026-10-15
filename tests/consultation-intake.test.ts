import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  acknowledgeIntake,
  PRIVACY_VERSION,
  SERVICE_COUNTRIES,
} from "../lib/consultation-intake";

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

test("consultation gates Tally on privacy and URL country; no legacy map or storage", () => {
  const source = readFileSync("components/consultation-flow.tsx", "utf8");
  const route = readFileSync("app/[region]/consultation/page.tsx", "utf8");
  assert.match(source, /useState<Step>\("intake"\)/);
  assert.match(source, /step === "form"/);
  assert.match(route, /await requireRegion\(params\)/);
  assert.match(route, /<ConsultationFlow country={country}\s*\/>/);
  assert.doesNotMatch(source, /localStorage|REGION_STORAGE_KEY/);
  assert.match(source, /NEXT_PUBLIC_TALLY_INTAKE_FORM_ID/);
  assert.doesNotMatch(source, /GoogleMaps|location_json|selectedPlace/);
});

