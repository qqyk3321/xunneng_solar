import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import test from "node:test";

test("main-site releases exclude real credentials and local-only projects", () => {
  const paths = [".env", ".env.local", "tools/facebook-mcp/.env", "ticket-query-local/package.json", "social-media/INDEX.md", "prototypes/assessment-form/package.json", "design/local-only.png", "exports/local-only.zip", "deprecated/local-only.ts"];
  const ignored = execFileSync("git", ["check-ignore", "--no-index", "--", ...paths], { encoding: "utf8" }).trim().split("\n");
  assert.deepEqual(ignored, paths);
  const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
  assert.deepEqual(tracked.filter(path => /(^|\/)\.env(?:\.|$)/.test(path) && !path.endsWith(".env.example")), []);
  assert.deepEqual(tracked.filter(path => /^(tools|ticket-query-local|social-media|prototypes|design|exports|deprecated)\//.test(path)), []);
});

test("repository configuration leaves Vercel Git deployments enabled", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8"));
  assert.notEqual(config.git?.deploymentEnabled, false);
  assert.notEqual(config.github?.enabled, false);
  assert.ok(!config.ignoreCommand, "do not silently skip production builds");
  assert.equal(config.buildCommand, "npm run build");
  const exclusions = readFileSync(".vercelignore", "utf8").split("\n");
  for (const path of [".env", ".env.*", "tools/", "prototypes/", "ticket-query-local/", "design/", "exports/", "deprecated/"]) assert.ok(exclusions.includes(path), path);
});
