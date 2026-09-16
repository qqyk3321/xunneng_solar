import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  countryFromPath,
  regionPath,
  switchedRegionPath,
} from "../lib/site-region-routing";

test("URL determines region exactly, without storage or ambiguous matches", () => {
  assert.equal(countryFromPath("/antigua"), "AG");
  assert.equal(countryFromPath("/"), "AG");
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
    "/antigua/privacy",
  );
  assert.doesNotMatch(
    readFileSync("components/site-region.tsx", "utf8"),
    /localStorage|sessionStorage|document\.cookie/,
  );
});

test("root alias preserves existing business URLs and avoids same-country navigation", () => {
  assert.equal(regionPath("AG"), "/antigua");
  assert.equal(regionPath("AG", "/consultation"), "/antigua/consultation");
  assert.equal(regionPath("AG", "/submission/example"), "/antigua/submission/example");
  assert.equal(countryFromPath("/antigua/submission/example"), "AG");
  assert.equal(switchedRegionPath("/", "AG"), "/");
  assert.equal(switchedRegionPath("/", "DM"), "/dominica");
  assert.equal(switchedRegionPath("/dominica", "AG"), "/antigua");
});

test("the region dialog has a real default without changing the URL country", () => {
  const source = readFileSync("components/site-region.tsx", "utf8");
  assert.ok(source.includes('useState<ServiceCountry>(country ?? "AG")'));
  assert.ok(source.includes('setDraft(country ?? "AG")'));
  assert.ok(source.includes('const country = countryFromPath(pathname)'));
});
