import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("global branded loading covers slow initial and client navigations", () => {
  const layout = read("app/layout.tsx");
  const loader = read("components/site-navigation-loader.tsx");
  const visual = read("components/site-loading-visual.tsx");
  const css = read("components/site-loading.module.css");

  assert.match(layout, /<SiteNavigationLoader\s*\/>/);
  assert.match(layout, /document\.documentElement\.dataset\.siteLoading="initial";window\.__solTideInitialLoader=window\.setTimeout/);
  assert.doesNotMatch(layout, /},180\)/);
  assert.match(layout, /},20000\)/);
  assert.match(loader, /document\.addEventListener\("click", navigate, true\)/);
  assert.match(loader, /window\.addEventListener\("popstate", restored\)/);
  assert.match(loader, /destination\.origin !== window\.location\.origin/);
  assert.match(loader, /const sameDocument/);
  assert.match(loader, /window\.location\.href !== fromHref/);
  assert.doesNotMatch(loader, /useSearchParams|<Suspense/);
  assert.match(visual, /Sol<span>&amp;<\/span>Tide/);
  assert.match(visual, /<svg viewBox="0 0 64 64"/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  const initialStyle = css.match(/:global\(html\[data-site-loading="initial"\]\) \.overlay \{([^}]+)\}/)?.[1];
  assert.ok(initialStyle);
  assert.match(initialStyle, /opacity: 1/);
  assert.doesNotMatch(initialStyle, /animation:\s*reveal/);
});

test("the route suspense fallback uses the same branded visual", () => {
  assert.match(read("app/loading.tsx"), /<SiteLoadingVisual fallback\s*\/>/);
});

test("report generation reuses an embedded brand loader without route-loader markers", () => {
  const visual = read("components/site-loading-visual.tsx");
  const report = read("app/solar-analysis/report-dialog.tsx");
  assert.match(visual, /data-route-loading=\{fallback && !embedded/);
  assert.match(visual, /data-site-loader=\{!fallback && !embedded/);
  assert.match(report, /<SiteLoadingVisual embedded/);
  assert.match(report, /percent:71,message:"PDF 已生成，正在准备预览/);
  assert.doesNotMatch(report, /report-spinner/);
  assert.match(read("components/site-loading.module.css"), /\.embedded \{[\s\S]*?position: relative/);
});
