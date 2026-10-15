// Read-only checks. Never authenticate, change prices, or send a real form.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execute = promisify(execFile);
const origin = process.env.INTERNAL_TOOLS_ORIGIN || "https://www.solortide.com";
const deployment = process.env.INTERNAL_TOOLS_DEPLOYMENT;
const paths = [
  "/solar-analysis", "/solar-analysis/visit", "/solar-analysis/manifest.webmanifest",
  "/solution-suggest", "/solution-suggest/visit",
  "/quote-settings", "/quote-settings/history",
  "/pwa", "/pwa/app", "/pwa/offline-permission", "/pwa/offline-assets.json",
  "/pwa/sw.js", "/solar-analysis/sw.js",
];

async function request(path, method = "GET") {
  const args = ["--silent", "--show-error", "--max-time", "30", "--include", "--request", method, "--write-out", "\n__STATUS__:%{http_code}"];
  if (method === "POST") args.push("--header", "Content-Type: application/x-www-form-urlencoded", "--data", "");
  const { stdout } = deployment
    ? await execute("vercel", ["curl", path, "--deployment", deployment, "--scope", "solortide2026", "--", ...args], { maxBuffer: 8 * 1024 * 1024 })
    : await execute("curl", [...args, new URL(path, origin).href], { maxBuffer: 8 * 1024 * 1024 });
  return { status: Number(stdout.match(/__STATUS__:(\d+)\s*$/)?.[1]), raw: stdout };
}

for (let offset = 0; offset < paths.length; offset += 3) {
  await Promise.all(paths.slice(offset, offset + 3).map(async path => {
    for (const method of ["GET", "POST"]) {
      const response = await request(path, method);
      if (method === "POST" && response.status === 200) {
        // Next streams notFound() with 200 for some POSTs to unknown country
        // roots. The tool and its action are absent; require the missing-page
        // result rather than adding a replacement route just to alter status.
        assert.match(response.raw, /This page could not be found|NEXT_HTTP_ERROR_FALLBACK;404/, path);
        assert.doesNotMatch(response.raw, /<form\b/);
      } else {
        assert.equal(response.status, 404, `${method} ${path}`);
      }
      assert.doesNotMatch(response.raw, /type="password"/);
    }
    console.log(`PASS closed page/API: ${path} (GET + POST)`);
  }));
}
console.log("PASS: expired pages, APIs and offline assets are absent from the deployed application.");
