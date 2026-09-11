import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { TEST_PAGES, MAIN_PAGE_ROUTES } from "../lib/test-pages/catalog";
import { TEST_ROUTE_ROOTS, isTestRoute } from "../lib/test-pages/access";
import { middleware, config } from "../middleware";
import { NextRequest } from "next/server";

test("every archived page and child API is behind a literal middleware matcher", () => {
  for (const page of TEST_PAGES) assert.ok(isTestRoute(page.route), page.route);
  for (const root of TEST_ROUTE_ROOTS) {
    assert.ok(config.matcher.includes(`${root}/:path*`));
    assert.ok(isTestRoute(`${root}/arbitrary-child`));
    assert.equal(isTestRoute(`${root}-not-a-child`), false);
  }
  for (const path of [
    ...MAIN_PAGE_ROUTES,
    "/api/contact",
    "/api/reverse-geocode",
  ]) {
    assert.equal(isTestRoute(path), false, path);
  }
});

test("production middleware rejects archived requests before auth, including callbacks and writes", async () => {
  const prior = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    for (const path of [
      ...TEST_ROUTE_ROOTS,
      "/auth-preview/confirm?code=fake",
      "/auth-preview/session",
      "/home-preview/contact",
      "/contact-submissions-preview/id/download",
    ]) {
      const response = await middleware(
        new NextRequest(`https://example.com${path}`),
      );
      assert.equal(response.status, 404, path);
      assert.match(response.headers.get("cache-control")!, /no-store/);
      assert.equal(response.cookies.getAll().length, 0);
    }
  } finally {
    if (prior === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prior;
  }
});

test("public header/footer contain no archived navigation", () => {
  for (const file of [
    "components/site-header.tsx",
    "components/site-footer.tsx",
  ]) {
    const source = readFileSync(file, "utf8");
    for (const root of TEST_ROUTE_ROOTS)
      assert.ok(!source.includes(`href="${root}`), file);
  }
});
