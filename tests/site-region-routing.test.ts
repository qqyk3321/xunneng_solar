import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  countryFromPath,
  regionPath,
  switchedRegionPath,
  regionIntentPath,
} from "../lib/site-region-routing";

test("URL determines region exactly, without storage or ambiguous matches", () => {
  assert.equal(countryFromPath("/antigua"), "AG");
  assert.equal(countryFromPath("/"), null);
  assert.equal(countryFromPath("/dominica/consultation"), "DM");
  for (const path of ["", "/faq", "/consultation", "/privacy", "/solar-analysis", "/antiguax", "/other/dominica", "/AG"])
    assert.equal(countryFromPath(path), null);
  assert.equal(regionPath("DM", "/faq"), "/dominica/faq");
  assert.equal(regionPath(null, "/consultation"), "/consultation");
  assert.equal(switchedRegionPath("/antigua/faq", "DM"), "/dominica/faq");
  assert.equal(
    switchedRegionPath("/consultation", "AG"),
    "/antigua/consultation",
  );
  assert.equal(
    switchedRegionPath("/dominica/privacy", "AG"),
    "/privacy",
  );
  assert.doesNotMatch(
    readFileSync("components/site-region.tsx", "utf8"),
    /localStorage|sessionStorage|document\.cookie/,
  );
});

test("neutral root navigates to explicit regional business URLs", () => {
  assert.equal(regionPath("AG"), "/antigua");
  assert.equal(regionPath("AG", "/consultation"), "/antigua/consultation");
  assert.equal(regionPath("AG", "/submission/example"), "/antigua/submission/example");
  assert.equal(countryFromPath("/antigua/submission/example"), "AG");
  assert.equal(switchedRegionPath("/", "AG"), "/antigua");
  assert.equal(switchedRegionPath("/", "DM"), "/dominica");
  assert.equal(switchedRegionPath("/dominica", "AG"), "/antigua");
});

test("country selection opens the chosen business page", () => {
  for (const country of ["AG", "DM"] as const) {
    const prefix = country === "AG" ? "/antigua" : "/dominica";
    assert.equal(regionIntentPath(country, "assessment"), `${prefix}/consultation`);
    assert.equal(regionIntentPath(country, "faq"), `${prefix}/faq`);
    assert.equal(regionIntentPath(country, "how-it-works"), `${prefix}/how-it-works`);
    assert.equal(regionPath(country, "/privacy"), "/privacy");
  }
});
