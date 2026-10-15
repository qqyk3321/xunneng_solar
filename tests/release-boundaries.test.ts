import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const retired: { path: string; methods: string[] }[] = JSON.parse(readFileSync("tests/fixtures/retired-routes.json", "utf8"));
const pageRoutes = ["/", "/privacy", "/[region]", "/[region]/consultation", "/[region]/faq", "/[region]/how-it-works", "/[region]/submission/[token]"];
const apiRoutes = ["/api/contact", "/api/island-wishlist", "/api/cron/supabase-keepalive"];

function entries(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? entries(file) : [file];
  });
}

test("only current business pages and APIs remain in the application route tree", () => {
  const files = entries("app");
  const paths = (suffix: string) => files.filter(f => f.endsWith(suffix))
    .map(f => f.slice(3, -suffix.length) || "/").sort();
  assert.deepEqual(paths("/page.tsx"), pageRoutes.sort());
  assert.deepEqual(paths("/route.ts"), apiRoutes.sort());
  for (const { path } of retired) {
    assert.equal(existsSync(`app${path}/page.tsx`), false, path);
    assert.equal(existsSync(`app${path}/route.ts`), false, path);
  }
  assert.equal(existsSync("middleware.ts"), false);
  assert.equal(existsSync("lib/test-pages"), false);
});

test("public navigation has no links to removed experiments", () => {
  for (const file of ["components/site-header.tsx", "components/site-footer.tsx"]) {
    const source = readFileSync(file, "utf8");
    for (const { path } of retired) assert.ok(!source.includes(`href="${path}`), file);
  }
});

test("retired auth dependencies are removed while business services and editors remain", () => {
  const { dependencies, scripts } = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(dependencies["@supabase/ssr"], undefined);
  assert.equal(scripts["test:auth"], undefined);
  for (const name of ["@supabase/supabase-js", "@tiptap/react", "@upstash/ratelimit", "@vercel/analytics", "@vercel/speed-insights"]) assert.ok(dependencies[name], name);
  for (const file of ["lib/anonymous-inquiry/handler.ts", "lib/anonymous-inquiry/compress.ts", "lib/anonymous-inquiry/image.ts", "lib/antigua-calculator/calculate.ts", "lib/quote-pricing/consultation-estimate.ts", "lib/solution-suggest/optimizer.ts"]) assert.ok(existsSync(file), file);
});
