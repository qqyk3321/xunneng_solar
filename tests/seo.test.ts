import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  siteUrl,
  regionMetadata,
  faqMetadata,
  regionOrganization,
  countryMetadata,
  regionAlternates,
  websiteIdentity,
  organizationIdentity,
} from "../lib/region-seo";
import sitemap from "../app/sitemap";
import { SITE_CONTACT } from "../lib/site-contact";

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

test("regional homes and FAQs have country-specific canonical URLs", async () => {
  for (const region of ["antigua", "dominica"]) {
    const params = Promise.resolve({ region });
    const home = await regionMetadata(params, "home");
    assert.equal(home.alternates?.canonical, siteUrl(`/${region}`));
    assert.match(String(home.title), new RegExp(region, "i"));
    assert.ok(home.openGraph?.images);
    assert.ok(home.twitter);
    assert.deepEqual(await regionMetadata(params, "faq"), faqMetadata(region === "antigua" ? "AG" : "DM"));
    assert.equal((await regionMetadata(params, "faq")).alternates?.canonical, siteUrl(`/${region}/faq`));
  }
  const urls = sitemap().map((entry) => entry.url);
  assert.ok(!urls.includes(siteUrl("/faq")));
  assert.ok(urls.includes(siteUrl("/antigua/faq")));
  assert.ok(urls.includes(siteUrl("/dominica/faq")));
  assert.ok(!urls.some((url) => url.includes("preview")));
});

test("Caribbean homepage has its own canonical with voluntary country selection", async () => {
  const provider = readFileSync("components/site-region.tsx", "utf8");
  assert.match(provider, /const open = !navigating && manual/);
  assert.doesNotMatch(provider, /requiresSelection/);
  const homepage = readFileSync("app/page.tsx", "utf8");
  assert.match(homepage, /<CaribbeanHomepage/);
  assert.match(homepage, /canonical: siteUrl\("\/"\)/);
  assert.match(homepage, /Solortide \| Sol & Tide Energy/);
  assert.match(homepage, /application\/ld\+json/);
  assert.match(readFileSync("app/[region]/page.tsx", "utf8"), /<RegionalHomepage country=\{country\}/);
  const shared = readFileSync("components/regional-homepage.tsx", "utf8");
  assert.match(shared, /application\/ld\+json/);
  assert.doesNotMatch(shared, /["']use client["']/);
  assert.doesNotMatch(
    shared,
    /SITE_CONTACT\.(phone|address)|aggregateRating/,
  );
  const links = readFileSync("components/region-links.tsx", "utf8");
  assert.match(links, /<Link[^>]+href=\{regionPath/);
  assert.deepEqual(countryMetadata("AG", "home"), await regionMetadata(Promise.resolve({ region: "antigua" }), "home"));
  assert.equal(regionAlternates()["x-default"], siteUrl("/"));
  assert.equal(regionAlternates("/consultation")["x-default"], undefined);
  const urls = sitemap().map(entry => entry.url);
  assert.ok(urls.includes(siteUrl("/")), "independent Caribbean root is listed");
  for (const path of ["/antigua", "/dominica", "/antigua/consultation", "/dominica/consultation"])
    assert.ok(urls.includes(siteUrl(path)));
});

test("homepage connects the Solortide website to Sol & Tide Energy", () => {
  const website = websiteIdentity();
  assert.equal(website["@type"], "WebSite");
  assert.equal(website.name, "Solortide");
  assert.equal(website.alternateName, "Sol & Tide Energy");
  assert.equal(website.url, siteUrl("/"));
  const organization = organizationIdentity();
  assert.equal(website.publisher["@id"], organization["@id"]);
  assert.equal(organization.name, "Sol & Tide Energy");
  assert.equal(organization.alternateName, "Solortide");
  assert.deepEqual(organization.contactPoint.map(point => point.email), [
    "ag-support@solortide.com", "dm-support@solortide.com",
  ]);
  const footer = readFileSync("components/site-footer.tsx", "utf8");
  assert.doesNotMatch(footer, /Solortide is the online home of Sol/);
  assert.match(footer, /<Link href="\/" prefetch=\{false\}>Solortide<\/Link>/);
  assert.match(footer, /— solar & storage built around your home/);
});

test("brand schemas identify the shared Facebook profile, not chat or placeholder contacts", () => {
  assert.equal(SITE_CONTACT.facebookUrl, "https://www.facebook.com/1435499099637488");
  assert.equal(SITE_CONTACT.messengerUrl, "https://m.me/1435499099637488");
  for (const country of [undefined, "AG", "DM"] as const) {
    const organization = organizationIdentity(country);
    assert.deepEqual(organization.sameAs, [SITE_CONTACT.facebookUrl]);
    assert.equal(organization.logo, siteUrl("/brand/solortide-logo.svg"));
    assert.ok(!("telephone" in organization));
    assert.ok(!("address" in organization));
  }
  for (const path of ["components/facebook-contact.tsx", "components/home-contact-methods.tsx"]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /href=\{SITE_CONTACT.facebookUrl\}/);
    assert.match(source, /href=\{SITE_CONTACT.messengerUrl\}/);
    assert.doesNotMatch(source, /https:\/\/(?:www\.facebook\.com|m\.me)\//);
  }
});

test("organization logo is 512px and preserves the existing favicon artwork", () => {
  const logo = readFileSync("public/brand/solortide-logo.svg", "utf8");
  const favicon = readFileSync("app/icon.svg", "utf8");
  assert.match(logo, /<svg[^>]*width="512"[^>]*height="512"/);
  assert.match(favicon, /<svg[^>]*width="64"[^>]*height="64"/);
  const artwork = (svg: string) => [...svg.matchAll(/<(?:rect|circle|path)\b[^>]*\/>/g)].map(([shape]) => shape);
  assert.deepEqual(artwork(logo), artwork(favicon));
});

test("sitemap alternates refer to indexable regional FAQ and system-guide pages", () => {
  const entries = sitemap();
  const urls = new Set(entries.map(entry => entry.url));
  assert.equal(urls.size, entries.length);
  for (const entry of entries) {
    for (const alternate of Object.values(entry.alternates?.languages ?? {})) {
      assert.ok(urls.has(String(alternate)), `alternate must be a canonical page: ${alternate}`);
    }
  }
  for (const prefix of ["/antigua", "/dominica"]) {
    const guide = entries.find(entry => entry.url === siteUrl(`${prefix}/how-it-works`));
    assert.deepEqual(guide?.alternates?.languages, regionAlternates("/how-it-works"));
  }
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

 test("sitemap excludes old redirect URLs and keeps one shared privacy policy", () => {
  const urls = sitemap().map(entry => entry.url);
  for (const path of ["/consultation", "/faq", "/how-it-works", "/antigua/privacy", "/dominica/privacy"]) {
    assert.ok(!urls.includes(siteUrl(path)));
  }
  assert.equal(urls.filter(url => url.endsWith("/privacy")).length, 1);
});
