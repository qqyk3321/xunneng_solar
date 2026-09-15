// Explicit opt-in: creates two clearly marked test inquiries and one tiny PNG.
// No email, no Tally request, no customer data, no deletion or config changes.
// CONTACT_STORAGE_LIVE_TEST=1 CONTACT_UPSTASH_ENABLED=false NODE_ENV=development node --env-file=.env --conditions=react-server --import tsx scripts/test-contact-storage-live.ts
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { POST } from "../app/api/contact/route";
import { textDocument } from "../lib/anonymous-inquiry/rich-text";
import { INQUIRY_TABLE, INQUIRY_BUCKET } from "../lib/anonymous-inquiry/config";

async function main() {
  assert.equal(process.env.CONTACT_STORAGE_LIVE_TEST, "1", "Explicit live-test opt-in required");
  const ref = readFileSync("supabase/.temp/project-ref", "utf8").trim();
  assert.equal(ref, "thiqsnscgdjwihcfpomw", "This acceptance test targets the new project only");
  const url = process.env.SUPABASE_URL!;
  assert.equal(new URL(url).hostname, `${ref}.supabase.co`);
  assert.equal(process.env.CONTACT_UPSTASH_ENABLED, "false", "Test expects the explicitly disabled Upstash setting");
  const origin = new URL(process.env.SITE_URL!).origin;
  const client = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", "base64");
  const ids: string[] = [];
  let imagePath = "";
  for (const format of ["plain", "rich"] as const) {
    const country = format === "plain" ? "AG" : "DM";
    const id = randomUUID();
    ids.push(id);
    const content = textDocument(`Migration verification: ${format} submission.\nTest only; no customer follow-up needed.`);
    if (format === "rich") {
      content.content.push({ type: "paragraph", content: [{ type: "text", text: "Bold text is preserved.", marks: [{ type: "bold" }] }] });
      content.content.push({ type: "inquiryImage", attrs: { id: randomUUID() } });
    }
    function request(requestOrigin = origin) {
      const body = new FormData();
      body.set("requestId", id);
      body.set("email", "migration-test@example.com");
      body.set("website", "");
      body.set("format", format);
      body.set("country_code", country);
      body.set("content", JSON.stringify(content));
      if (format === "rich") body.append("images", new Blob([png], { type: "image/png" }), "migration-test.png");
      return new Request(`${origin}/api/contact`, { method: "POST", headers: { origin: requestOrigin }, body });
    }
    const response = await POST(request());
    assert.equal(response.status, 201, await response.text());
    const duplicate = await POST(request());
    assert.equal(duplicate.status, 201, await duplicate.text());
    const differentCountry = await request().formData();
    differentCountry.set("country_code", country === "AG" ? "DM" : "AG");
    const conflict = await POST(new Request(`${origin}/api/contact`, { method: "POST", headers: { origin }, body: differentCountry }));
    assert.equal(conflict.status, 409, "Same request ID must not silently change country");
    assert.equal((await POST(request("https://untrusted.example"))).status, 403);
    const saved = await client.from(INQUIRY_TABLE).select("id,email,message,format,content,images,country_code,country_name").eq("id", id);
    assert.equal(saved.error, null);
    assert.equal(saved.data!.length, 1);
    const row = saved.data![0];
    assert.equal(row.format, format);
    assert.equal(row.country_code, country);
    assert.equal(row.country_name, country === "AG" ? "Antigua and Barbuda" : "Dominica");
    assert.equal(row.email, "migration-test@example.com");
    assert.match(row.message, /\n/);
    assert.deepEqual(row.content, content);
    assert.equal(row.images.length, format === "rich" ? 1 : 0);
    if (format === "rich") imagePath = row.images[0].path;
  }
  const bucket = await client.storage.getBucket(INQUIRY_BUCKET);
  assert.equal(bucket.error, null);
  assert.equal(bucket.data!.public, false);
  const downloaded = await client.storage.from(INQUIRY_BUCKET).download(imagePath);
  assert.equal(downloaded.error, null);
  assert.deepEqual(Buffer.from(await downloaded.data!.arrayBuffer()), png);
  const signed = await client.storage.from(INQUIRY_BUCKET).createSignedUrl(imagePath, 60);
  assert.equal(signed.error, null);
  const preview = await fetch(signed.data!.signedUrl);
  assert.equal(preview.status, 200);
  assert.deepEqual(Buffer.from(await preview.arrayBuffer()), png);
  const publicPreview = await fetch(`${url}/storage/v1/object/public/${INQUIRY_BUCKET}/${imagePath}`);
  assert.ok(!publicPreview.ok, "Private image must not be publicly downloadable");
  const rawKeys = JSON.parse(execFileSync("supabase", ["projects", "api-keys", "--project-ref", ref, "--output-format", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000 }));
  const anonKey = (rawKeys.keys ?? rawKeys).find((k: { name: string }) => k.name === "anon").api_key;
  const anonymous = createClient(url, anonKey, { auth: { persistSession: false } });
  const read = await anonymous.from(INQUIRY_TABLE).select("id").limit(1);
  assert.ok([401, 403].includes(read.status), "Anonymous table read must be denied");
  const write = await anonymous.from(INQUIRY_TABLE).insert({ id: randomUUID() });
  assert.ok([401, 403].includes(write.status), "Anonymous table write must be denied");
  const deniedImage = await anonymous.storage.from(INQUIRY_BUCKET).download(imagePath);
  assert.ok(deniedImage.error, "Anonymous private-image read must be denied");
  console.log(JSON.stringify({ ok: true, testRowsKept: 2, testImagesKept: 1, ids, checks: ["plain", "rich", "newlines", "image upload/download", "signed preview", "duplicate", "origin", "private bucket", "anonymous read/write denied"] }));
}
main().catch((error) => {
  console.error(error instanceof assert.AssertionError ? error.message : "Contact storage live verification failed; inspect server-side diagnostics.");
  process.exitCode = 1;
});
