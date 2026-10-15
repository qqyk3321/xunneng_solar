// Read-only verification against a Vercel candidate or the canonical production site.
// SEO_VERCEL_DEPLOYMENT uses the locally authenticated Vercel CLI without exposing secrets.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execute = promisify(execFile);
const origin = "https://www.solortide.com";
const deployment = process.env.SEO_VERCEL_DEPLOYMENT;
const decode = text => text.replaceAll("&amp;", "&");
const parseAttributes = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, decode(value)]));

async function get(path) {
  const args = ["--silent", "--show-error", "--max-time", "30", "--include", "--write-out", "\n__SEO_STATUS__:%{http_code}"];
  const { stdout } = deployment
    ? await execute("vercel", ["curl", path, "--deployment", deployment, "--scope", "solortide2026", "--", ...args], { maxBuffer: 8 * 1024 * 1024 })
    : await execute("curl", [...args, new URL(path, origin).href], { maxBuffer: 8 * 1024 * 1024 });
  const status = Number(stdout.match(/__SEO_STATUS__:(\d+)\s*$/)?.[1]);
  const links = [...stdout.matchAll(/<link\b[^>]*>/g)].map(([tag]) => parseAttributes(tag));
  const metas = [...stdout.matchAll(/<meta\b[^>]*>/g)].map(([tag]) => parseAttributes(tag));
  return {
    raw: stdout,
    status,
    canonical: links.find(link => link.rel === "canonical")?.href,
    robots: metas.filter(meta => meta.name === "robots").map(meta => meta.content).join(","),
    headerRobots: stdout.match(/^x-robots-tag:\s*([^\r\n]+)/mi)?.[1] || "",
    title: decode(stdout.match(/<title>(.*?)<\/title>/s)?.[1] || ""),
    alternates: links.filter(link => link.rel === "alternate" && (link.hrefLang || link.hreflang)),
  };
}

const sitemap = await get("/sitemap.xml");
assert.equal(sitemap.status, 200);
const urls = [...sitemap.raw.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, value]) => decode(value));
const publicPaths = ["/", "/privacy", ...["antigua", "dominica"].flatMap(region =>
  ["", "/consultation", "/faq", "/how-it-works"].map(suffix => `/${region}${suffix}`),
)];
assert.deepEqual([...urls].sort(), publicPaths.map(path => new URL(path, origin).href).sort());
assert.ok(urls.includes(`${origin}/antigua/faq`));
assert.ok(urls.includes(`${origin}/dominica/faq`));
assert.ok(!urls.includes(`${origin}/faq`));

// Bound concurrency so the diagnostic is gentle on the production site.
const publicPages = new Map();
for (let offset = 0; offset < urls.length; offset += 3) {
  await Promise.all(urls.slice(offset, offset + 3).map(async url => {
    assert.equal(new URL(url).origin, origin);
    const path = new URL(url).pathname;
    const page = await get(path);
    publicPages.set(url, page);
    assert.equal(page.status, 200, path);
    assert.equal(new URL(page.canonical).href, url, path);
    assert.match(page.robots, /index, follow/, path);
    assert.doesNotMatch(page.robots, /noindex/, path);
    // Vercel protects non-canonical deployment URLs with its own noindex header.
    if (!deployment) assert.doesNotMatch(page.headerRobots, /noindex/, path);
    if (path !== "/privacy") assert.match(page.title, /Solortide/, path);
    for (const alternate of page.alternates) assert.ok(urls.includes(new URL(alternate.href).href), path);
    console.log(`PASS ${path}: 200, self-canonical, indexable; ${page.title}`);
  }));
}

// Inspect rendered links as well as the sitemap: a retired URL can survive in
// a header, footer or FAQ even when it is no longer listed for search engines.
let internalLinks = 0;
const checkedTargets = new Map(publicPages);
for (const [url, page] of publicPages) {
  for (const [tag] of page.raw.matchAll(/<a\b[^>]*>/g)) {
    const { href } = parseAttributes(tag);
    if (!href) continue;
    const destination = new URL(href, url);
    if (destination.origin !== origin) continue;
    internalLinks++;
    destination.hash = "";
    const target = checkedTargets.get(destination.href) || await get(destination.pathname + destination.search);
    checkedTargets.set(destination.href, target);
    assert.equal(target.status, 200, `broken or redirected link on ${url}: ${href}`);
  }
}
console.log(`PASS ${internalLinks} rendered internal links: no broken or obsolete redirect destinations.`);

const home = await get("/");
const schemas = [...home.raw.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(([, value]) => JSON.parse(value));
const website = schemas.find(item => item["@type"] === "WebSite");
const organization = schemas.find(item => item["@type"] === "Organization");
assert.equal(website.name, "Solortide");
assert.equal(organization.alternateName, "Solortide");
assert.equal(website.publisher["@id"], organization["@id"]);
assert.match(home.raw, /Solortide by Sol &amp; Tide Energy/);
assert.match((await get("/faq")).robots, /noindex/);
for (const region of ["antigua", "dominica"]) {
  const privacy = await get(`/${region}/privacy`);
  assert.equal(privacy.status, 404);
  const invalidToken = await get(`/${region}/submission/not-a-real-token`);
  assert.match(invalidToken.robots, /noindex/);
  assert.doesNotMatch(invalidToken.raw, /data-testid="submission-monthly-kwh"/);
}
for (const path of ["/consultation", "/faq", "/how-it-works", "/not-a-service-country", "/services", "/products", "/invalid-region/faq", "/invalid-region/privacy", "/submission-preview-test"]) {
  assert.equal((await get(path)).status, 404, path);
}
const slash = await get("/antigua/");
assert.equal(slash.status, 308);
assert.match(slash.raw, /^location:\s*\/antigua\s*$/mi);
const robots = await get("/robots.txt");
assert.equal(robots.status, 200);
assert.match(robots.raw, /Allow: \/\s/);
assert.doesNotMatch(robots.raw, /Disallow: \/\s/);
assert.match(robots.raw, /Sitemap: https:\/\/www\.solortide\.com\/sitemap\.xml/);
const social = await get("/opengraph-image");
assert.equal(social.status, 200);
assert.match(social.raw, /^content-type:\s*image\/png/mi);
console.log(`PASS ${deployment || origin}: brand schemas, robots, regional FAQ, shared privacy, retired-route 404, protected private/test routes, redirects and social image. No forms submitted.`);
