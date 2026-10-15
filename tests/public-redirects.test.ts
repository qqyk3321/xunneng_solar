import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import config from "../next.config";

test("removed public entry pages have no route files or compatibility redirects", async () => {
  assert.deepEqual(await config.redirects?.() ?? [], []);
  for (const file of ["app/consultation/page.tsx", "app/faq/page.tsx", "app/how-it-works/page.tsx", "app/[region]/privacy/page.tsx"]) {
    assert.equal(existsSync(file), false, file);
  }
  assert.doesNotMatch(readFileSync("components/site-region.tsx", "utf8"), /parseRegionIntent|searchParams\.get\("intent"\)/);
});

test("private submission URLs are not sent through HTTP referrer headers", async () => {
  const headers = await config.headers!();
  const rule = headers.find(rule => rule.source === "/:region(antigua|dominica)/submission/:token");
  assert.ok(rule?.headers.some(header => header.key === "Referrer-Policy" && header.value === "no-referrer"));
});
