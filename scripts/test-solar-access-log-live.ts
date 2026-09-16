// Opt-in, creates ONE identifiable synthetic visit in the linked project.
// Does not submit a form, send email, delete data or print credentials.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { accessCookieValue } from "../app/solar-analysis/access";
import { handleSolarVisit } from "../lib/solar-analysis/visit-server";

async function main() {
  assert.equal(process.env.SOLAR_ACCESS_LOG_LIVE_TEST, "1", "Explicit opt-in required");
  const ref = readFileSync("supabase/.temp/project-ref", "utf8").trim();
  const url = process.env.SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  assert.equal(new URL(url).hostname, `${ref}.supabase.co`, "App and migration project must match");
  assert.ok(service);
  // CLI output is kept in memory; do not print any API keys.
  const keys = JSON.parse(execFileSync("supabase", ["projects", "api-keys", "--project-ref", ref, "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })) as { name: string; api_key: string }[];
  const anon = keys.find(key => key.name === "anon")?.api_key;
  assert.ok(anon, "Anonymous API key is required to verify access denial");
  const id = randomUUID();
  const rejectedId = randomUUID();
  const agent = `solar-access-log-live-test/${id}`;
  const env = { ...process.env, VERCEL: "1", VERCEL_ENV: "development", NODE_ENV: "development", SITE_URL: "https://solar-log-test.invalid" };
  const input = (visitId: string) => new Request(`${env.SITE_URL}/solar-analysis/visit`, {
    method: "POST",
    headers: { Origin: env.SITE_URL, "Content-Type": "application/json", "User-Agent": agent, "x-forwarded-for": "192.0.2.77" },
    body: JSON.stringify({ id: visitId }),
  });
  assert.equal((await handleSolarVisit(input(rejectedId), "wrong-cookie", { env })).status, 401);
  assert.equal((await handleSolarVisit(input(id), accessCookieValue(), { env })).status, 204);
  // Repeating the same visit ID must not create a second row or update its time.
  assert.equal((await handleSolarVisit(input(id), accessCookieValue(), { env })).status, 204);
  const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });
  const read = await fetch(`${url}/rest/v1/solar_analysis_access_logs?id=in.(${id},${rejectedId})&select=*`, { headers: headers(service), signal: AbortSignal.timeout(15000) });
  assert.equal(read.status, 200);
  const rows = await read.json();
  assert.equal(rows.length, 1, "one successful record, no failed-access record");
  assert.equal(rows[0].id, id);
  assert.equal(rows[0].ip_address, "192.0.2.77");
  assert.equal(rows[0].user_agent, agent);
  assert.equal(rows[0].environment, "development");
  assert.ok(Number.isFinite(Date.parse(rows[0].accessed_at)));
  for (const method of ["GET", "POST"]) {
    const response = await fetch(`${url}/rest/v1/solar_analysis_access_logs${method === "GET" ? `?id=eq.${id}` : ""}`, {
      method, headers: headers(anon), signal: AbortSignal.timeout(15000),
      ...(method === "POST" ? { body: JSON.stringify({ id: rejectedId, environment: "development" }) } : {}),
    });
    assert.ok([401, 403].includes(response.status), `${method} with anon key must be denied`);
    await response.body?.cancel();
  }
  console.log(`PASS real database: authorized write, duplicate suppression, rejected cookie omitted, anonymous read/write denied. Retained synthetic record: ${id}`);
}

main().catch(error => {
  // Keep credentials and response bodies out of diagnostics.
  console.error(error instanceof Error ? error.message : "Live verification failed");
  process.exitCode = 1;
});
