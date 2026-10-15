import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import * as pricing from "../lib/quote-pricing/server";

const roots = ["solar-analysis", "solution-suggest", "quote-settings", "pwa"];

test("expired tools have no active routes or replacement interceptors", () => {
  for (const root of roots) {
    assert.equal(existsSync(`app/${root}`), false, root);
    // Historical source is a local-only archive, not a build/test dependency.
  }
  assert.equal(existsSync("lib/internal-tools"), false);
  for (const root of ["solar-analysis", "pwa"]) assert.equal(existsSync(`public/${root}`), false);
  for (const file of ["access.ts", "login-limit.ts"]) assert.equal(existsSync(`lib/quote-pricing/${file}`), false);
  assert.deepEqual(Object.keys(pricing), ["loadPricing"], "public customer results can read prices; business website no longer exposes management functions");
});

test("archive and offline tooling are excluded from builds and deployment", () => {
  assert.match(readFileSync(".vercelignore", "utf8"), /^deprecated\/$/m);
  assert.ok(JSON.parse(readFileSync("tsconfig.json", "utf8")).exclude.includes("deprecated"));
  assert.match(readFileSync("eslint.config.mjs", "utf8"), /deprecated\/\*\*/);
  const { scripts, dependencies } = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(scripts.postbuild, undefined);
  assert.equal(scripts["solar:offline"], undefined);
  assert.equal(dependencies.echarts, undefined);
  assert.equal(dependencies["pdfjs-dist"], undefined);
  assert.equal(existsSync("scripts/solar/build-offline-assets.mjs"), false);
});
