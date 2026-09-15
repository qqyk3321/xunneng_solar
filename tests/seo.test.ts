import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  siteUrl,
  regionMetadata,
  faqMetadata,
  regionOrganization,
} from "../lib/region-seo";
import sitemap from "../app/sitemap";

test("SEO uses configured origin or the official production fallback", () => {
  const previous = process.env.SITE_URL;
  try {
    delete process.env.SITE_URL;
    assert.equal(siteUrl("/dominica"), "https://www.solortide.com/dominica");
    process.env.SITE_URL = "http://localhost:3003";
    assert.equal(siteUrl("/antigua"), "http://localhost:3003/antigua");
  } finally {
    if (previous === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = previous;
  }
});

test("regional homes have independent metadata and shared FAQ has a single canonical", async () => {
  for (const region of ["antigua", "dominica"]) {
    const params = Promise.resolve({ region });
    const home = await regionMetadata(params, "home");
    assert.equal(home.alternates?.canonical, siteUrl(`/${region}`));
    assert.match(String(home.title), new RegExp(region, "i"));
    assert.ok(home.openGraph?.images);
    assert.ok(home.twitter);
    assert.deepEqual(await regionMetadata(params, "faq"), faqMetadata());
  }
  const urls = sitemap().map((entry) => entry.url);
  assert.ok(urls.includes(siteUrl("/faq")));
  assert.ok(!urls.includes(siteUrl("/antigua/faq")));
  assert.ok(!urls.some((url) => url.includes("preview")));
});

test("homepage keeps a required region dialog and truthful organization fields", () => {
  const provider = readFileSync("components/site-region.tsx", "utf8");
  assert.match(provider, /requiresSelection = pathname === "\/"/);
  assert.match(provider, /requiresSelection \|\| manual/);
  const homepage = readFileSync("app/page.tsx", "utf8");
  assert.match(homepage, /application\/ld\+json/);
  assert.doesNotMatch(
    homepage,
    /SITE_CONTACT\.(phone|address)|aggregateRating/,
  );
  const links = readFileSync("components/region-links.tsx", "utf8");
  assert.match(links, /<Link[^>]+href=\{regionPath/);
});

test("regional structured contacts match visible support and never invent a common mailbox", () => {
  for (const [country, email, name] of [
    ["AG", "ag-support@solortide.com", "Antigua and Barbuda"],
    ["DM", "dm-support@solortide.com", "Dominica"],
  ] as const) {
    const org = regionOrganization(country);
    assert.equal(org["@id"], siteUrl("/#organization"));
    assert.equal(org.contactPoint[0].email, email);
    assert.equal(org.contactPoint[0].areaServed.name, name);
    assert.ok(!("address" in org));
  }
  assert.doesNotMatch(readFileSync("app/page.tsx", "utf8"), /email:/);
  assert.doesNotMatch(
    readFileSync("lib/site-contact.ts", "utf8"),
    /["']support@solortide\.com/,
  );
});
