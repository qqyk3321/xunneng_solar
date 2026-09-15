import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  MAIN_PAGE_ROUTES,
  TEST_GROUPS,
  TEST_HUB_PATH,
  TEST_PAGES,
  filterTestPages,
} from "../lib/test-pages/catalog";

function pageRoutes(directory: string): string[] {
  const app = join(process.cwd(), "app");
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return pageRoutes(path);
    if (!/^page\.(tsx|ts|jsx|js)$/.test(entry.name)) return [];
    const route =
      "/" +
      relative(app, directory)
        .split("/")
        .filter(
          (segment) =>
            segment && !segment.startsWith("(") && !segment.startsWith("@"),
        )
        .join("/");
    return [route];
  });
}

test("every application page is either a main route, the hub, or a registered experiment", () => {
  const existing = pageRoutes(join(process.cwd(), "app"));
  const registered = TEST_PAGES.map((page) => page.route);
  assert.equal(new Set(registered).size, registered.length);
  assert.deepEqual(
    new Set(existing),
    new Set([...MAIN_PAGE_ROUTES, TEST_HUB_PATH, ...registered]),
    "Register new test pages in lib/test-pages/catalog.ts instead of leaving orphan routes",
  );
});
test("navigation targets are real local pages; dynamic previews never use placeholder links", () => {
  const existing = pageRoutes(join(process.cwd(), "app"));
  for (const entry of TEST_PAGES) {
    assert.ok(TEST_GROUPS.some((group) => group.id === entry.group));
    assert.ok(entry.title && entry.description && entry.access);
    for (const link of [entry, ...(entry.shortcuts ?? [])]) {
      assert.ok(link.href.startsWith("/") && !link.href.startsWith("//"));
      const url = new URL(link.href, "http://localhost");
      assert.equal(url.origin, "http://localhost");
      assert.ok(existing.includes(url.pathname));
      assert.doesNotMatch(
        url.pathname,
        /\[|\/api\/|\/action$|\/submit$|\/confirm$|\/download$/,
      );
    }
  }
  assert.equal(
    TEST_PAGES.find(
      (page) => page.route === "/contact-submissions-preview/[id]",
    )?.href,
    "/contact-submissions-preview",
  );
  assert.ok(TEST_PAGES.some(page => page.route === "/submission-preview-test"));
});
test("search is local, case-insensitive and supports routes, Chinese keywords and category filters", () => {
  assert.equal(filterTestPages("").length, TEST_PAGES.length);
  assert.deepEqual(filterTestPages("JSON"), filterTestPages("json"));
  assert.ok(
    filterTestPages("登录").some((page) => page.route === "/auth-preview"),
  );
  assert.equal(filterTestPages("富文本").length, 2);
  assert.equal(filterTestPages("/contact-submissions-preview").length, 2);
  assert.ok(
    filterTestPages("  contact   download  ").some(
      (page) => page.route === "/contact-submissions-preview",
    ),
  );
  assert.ok(
    filterTestPages("", "media").every((page) => page.group === "media"),
  );
  assert.deepEqual(filterTestPages("no-such-test-at-all"), []);
});
test("hub is development-only and the directory never imports data readers or page components", () => {
  const page = readFileSync(
    join(process.cwd(), "app/test-pages/page.tsx"),
    "utf8",
  );
  assert.match(page, /process\.env\.NODE_ENV !== "development"\) notFound\(\)/);
  assert.match(page, /index: false/);
  const component = readFileSync(
    join(process.cwd(), "app/test-pages/test-directory.tsx"),
    "utf8",
  );
  const catalog = readFileSync(
    join(process.cwd(), "lib/test-pages/catalog.ts"),
    "utf8",
  );
  assert.doesNotMatch(
    component + catalog,
    /\bfetch\(|createClient\(|createContactReader|\/server["']|next\/link/,
  );
  assert.match(component, /target: "_blank"/);
});
