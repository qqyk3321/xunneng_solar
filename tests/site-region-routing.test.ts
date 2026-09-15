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
  assert.equal(countryFromPath("/dominica/consultation"), "DM");
  for (const path of ["/", "/faq", "/antiguax", "/other/dominica", "/AG"])
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

test("the region dialog has a real default without changing the URL country", () => {
  const source = readFileSync("components/site-region.tsx", "utf8");
  assert.ok(source.includes('useState<ServiceCountry>(country ?? "AG")'));
  assert.ok(source.includes('setDraft(country ?? "AG")'));
  assert.ok(source.includes('const country = countryFromPath(pathname)'));
});
