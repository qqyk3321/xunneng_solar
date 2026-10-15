// Read-only release regression: a local HTTP fixture, never the production database.
// Build first, then run with SEO_RELEASE_DIR and optionally SEO_BROWSER_TEST=1.
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const release = resolve(process.env.SEO_RELEASE_DIR || ".");
const canonicalOrigin = "https://www.solortide.com";
const tokens = ["antigua", "dominica"].map((region) => {
  const token = randomBytes(32).toString("base64url");
  return { region, token, hash: createHash("sha256").update(token).digest("hex") };
});
const reads = new Set();
const unexpectedRequests = [];
const fixture = createServer((request, response) => {
  const url = new URL(request.url, "http://fixture.invalid");
  if (request.method !== "GET" || url.pathname !== "/rest/v1/consultation_preview_tokens") {
    unexpectedRequests.push(`${request.method} ${url.pathname}`);
    response.writeHead(500).end();
    return;
  }
  const record = tokens.find(({ hash }) => url.searchParams.get("token_hash") === `eq.${hash}`);
  if (record) reads.add(record.region);
  const rows = record ? [{ tally_form_submissions: {
    submission_id: `seo-fixture-${record.region}`,
    country_code: record.region === "antigua" ? "AG" : "DM",
    name: "SEO regression fixture",
    email: "fixture@example.invalid",
    phone: "",
    address: {},
    preview_url: null,
    submitted_at: "2026-10-10T00:00:00.000Z",
    monthly_kwh: null,
    consumption_profile: null,
  } }] : [];
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(rows));
});

const decode = (text) => text.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#x27;", "'");
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, decode(value)]));
}
function metadata(html) {
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map(([tag]) => attributes(tag));
  const metas = [...html.matchAll(/<meta\b[^>]*>/g)].map(([tag]) => attributes(tag));
  return {
    canonical: links.find((link) => link.rel === "canonical")?.href,
    robots: metas.filter((meta) => meta.name === "robots").map((meta) => meta.content).join(","),
    title: decode(html.match(/<title>(.*?)<\/title>/s)?.[1] || ""),
    alternates: links.filter((link) => link.rel === "alternate" && (link.hrefLang || link.hreflang)),
  };
}

await new Promise((done) => fixture.listen(0, "127.0.0.1", done));
const reservation = createServer();
await new Promise((done) => reservation.listen(0, "127.0.0.1", done));
const port = reservation.address().port;
await new Promise((done) => reservation.close(done));
const origin = `http://127.0.0.1:${port}`;
let serverLog = "";
const server = spawn(process.execPath, [resolve(release, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: release,
  env: {
    ...process.env,
    NODE_ENV: "production",
    VERCEL_ENV: "production",
    SITE_URL: canonicalOrigin,
    SUPABASE_URL: `http://127.0.0.1:${fixture.address().port}`,
    SUPABASE_SERVICE_ROLE_KEY: "local-seo-fixture-only",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (chunk) => { serverLog += chunk; });
server.stderr.on("data", (chunk) => { serverLog += chunk; });

async function get(path, userAgent) {
  const response = await fetch(`${origin}${path}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
    ...(userAgent ? { headers: { "User-Agent": userAgent } } : {}),
  });
  const html = await response.text();
  return { response, html, ...metadata(html) };
}

try {
  for (let attempt = 0; ; attempt++) {
    try { await get("/robots.txt"); break; }
    catch (error) {
      if (attempt > 100 || server.exitCode !== null) throw new Error(`Release server failed: ${serverLog}`, { cause: error });
      await new Promise((done) => setTimeout(done, 200));
    }
  }
  const sitemap = await get("/sitemap.xml");
  assert.equal(sitemap.response.status, 200);
  const urls = [...sitemap.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => decode(url));
  const publicPaths = ["/", "/privacy", ...["antigua", "dominica"].flatMap(region =>
    ["", "/consultation", "/faq", "/how-it-works"].map(suffix => `/${region}${suffix}`),
  )];
  assert.deepEqual([...urls].sort(), publicPaths.map(path => new URL(path, canonicalOrigin).href).sort());
  assert.ok(urls.includes(`${canonicalOrigin}/antigua/faq`));
  assert.ok(urls.includes(`${canonicalOrigin}/dominica/faq`));
  assert.ok(!urls.includes(`${canonicalOrigin}/faq`));
  assert.ok(!urls.some((url) => /submission|preview/.test(url)));
  for (const url of urls) {
    const path = new URL(url).pathname;
    const page = await get(path);
    assert.equal(page.response.status, 200, path);
    assert.equal(new URL(page.canonical).href, new URL(url).href, path);
    assert.match(page.robots, /index, follow/, path);
    assert.doesNotMatch(page.robots, /noindex/, path);
    if (path !== "/privacy") assert.match(page.title, /Solortide/, path);
    for (const alternate of page.alternates) assert.ok(urls.includes(new URL(alternate.href).href), `invalid alternate on ${path}`);
  }
  console.log("PASS: all 10 sitemap pages are 200, indexable, canonical and correctly branded.");

  const home = await get("/");
  const schemas = [...home.html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(([, text]) => JSON.parse(text));
  const website = schemas.find((item) => item["@type"] === "WebSite");
  const organization = schemas.find((item) => item["@type"] === "Organization");
  assert.equal(website?.name, "Solortide");
  assert.equal(organization?.alternateName, "Solortide");
  assert.equal(website.publisher["@id"], organization["@id"]);
  assert.match(home.html, /Solortide by Sol &amp; Tide Energy/);
  const robots = await get("/robots.txt");
  assert.match(robots.html, /Allow: \/\s/);
  assert.match(robots.html, /Sitemap: https:\/\/www\.solortide\.com\/sitemap\.xml/);
  assert.doesNotMatch(robots.html, /Disallow: \/\s/);
  assert.match((await get("/faq")).robots, /noindex/);
  for (const region of ["antigua", "dominica"]) {
    const privacy = await get(`/${region}/privacy`);
    assert.equal(privacy.response.status, 404);
  }
  console.log("PASS: brand schemas, robots, regional FAQ and privacy indexing rules.");

  for (const agent of [undefined, "Googlebot"]) {
    for (const path of ["/consultation", "/faq", "/how-it-works", "/not-a-service-country", "/services", "/products", "/invalid-region/faq", "/invalid-region/privacy", "/invalid-region/consultation", "/invalid-region/how-it-works"]) {
      const page = await get(path, agent);
      assert.equal(page.response.status, 404, `${path} (${agent || "browser"})`);
    }
  }
  const slash = await get("/antigua/");
  assert.equal(slash.response.status, 308);
  assert.equal(slash.response.headers.get("location"), "/antigua");
  const blocked = await get("/submission-preview-test");
  assert.equal(blocked.response.status, 404);
  assert.match(blocked.robots, /noindex/);
  console.log("PASS: invalid regions and removed pages are actual 404s/noindex; trailing-slash normalization remains.");

  // Tokens are generated after build, proving dynamic child routes remain usable.
  for (const { region, token } of tokens) {
    const page = await get(`/${region}/submission/${token}`);
    assert.equal(page.response.status, 200);
    assert.match(page.html, new RegExp(`seo-fixture-${region}`));
    assert.match(page.html, /data-testid="submission-monthly-kwh"/);
    assert.match(page.robots, /noindex, nofollow/);
    const other = region === "antigua" ? "dominica" : "antigua";
    const mismatch = await get(`/${other}/submission/${token}`);
    assert.doesNotMatch(mismatch.html, /data-testid="submission-monthly-kwh"/);
    assert.match(mismatch.robots, /noindex/);
  }
  assert.equal(reads.size, 2);
  assert.deepEqual(unexpectedRequests, []);
  console.log("PASS: new private result tokens load in both countries and remain noindex; wrong-country tokens are denied. No production database used.");

  if (process.env.SEO_BROWSER_TEST === "1") {
    const browserTest = spawn(process.execPath, [resolve("tests/seo-brand.browser.cjs")], {
      env: { ...process.env, HOME_TEST_ORIGIN: origin },
      stdio: "inherit",
    });
    const [code] = await once(browserTest, "exit");
    assert.equal(code, 0, "desktop/mobile browser regression");
  }
} finally {
  server.kill("SIGTERM");
  if (server.exitCode === null) await once(server, "exit");
  fixture.closeAllConnections();
  await new Promise((done) => fixture.close(done));
}
