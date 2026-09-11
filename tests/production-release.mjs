// Run against an already-built, loopback-only Next.js production server.
// Opt-in live mode creates TWO clearly marked messages and ONE tiny fixture image.
// No emails, deletes, account changes, or server startup occur in this script.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const base = process.env.PREVIEW_TEST_ORIGIN;
assert.ok(
  base && new URL(base).hostname === "127.0.0.1",
  "Use an isolated loopback production server",
);
const siteOrigin = "https://release-check.example";
const live = process.env.PRODUCTION_CONTACT_LIVE_WRITE === "1";
const paths = [
  "/test-pages",
  "/home-preview",
  "/auth-preview",
  "/auth-preview/update-password",
  "/auth-preview/session",
  "/auth-preview/confirm?code=invalid",
  "/my-submissions-preview",
  "/antigua-calculator-preview",
  "/contact-preview",
  "/contact-submissions-preview",
  "/contact-submissions-preview/4583a8b3-a6a3-435d-b332-bfab81c1fb91",
  "/contact-submissions-preview/4583a8b3-a6a3-435d-b332-bfab81c1fb91/data",
  "/contact-submissions-preview/4583a8b3-a6a3-435d-b332-bfab81c1fb91/download?format=json",
  "/image-upload-preview",
  "/rich-text-preview",
  "/rich-text-preview/view",
];
for (const path of paths) {
  const response = await fetch(base + path, { redirect: "manual" });
  assert.equal(response.status, 404, path);
  assert.match(response.headers.get("cache-control"), /no-store/);
}
for (const path of [
  "/auth-preview/action",
  "/home-preview/contact",
  "/contact-preview/submit",
  "/rich-text-preview/submit",
  "/image-upload-preview/upload",
]) {
  assert.equal(
    (await fetch(base + path, { method: "POST" })).status,
    404,
    path,
  );
}
for (const path of ["/", "/faq", "/consultation"]) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  if (path !== "/consultation") {
    assert.match(html, /Send message/);
    assert.match(html, /Add photos/);
    assert.doesNotMatch(
      html,
      /href="\/(?:test-pages|auth-preview|home-preview)/,
    );
  }
}
assert.equal(
  (
    await fetch(base + "/submission-preview-test?id=invalid", {
      redirect: "manual",
    })
  ).status,
  307,
);
assert.equal((await fetch(base + "/api/contact")).status, 405);
for (const origin of ["https://evil.example", "null", ""]) {
  assert.equal(
    (
      await fetch(base + "/api/contact", {
        method: "POST",
        headers: { origin },
      })
    ).status,
    403,
  );
}

const ids = [];
if (live) {
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const email = `release-check-${Date.now()}@example.com`;
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aAn8AAAAASUVORK5CYII=",
    "base64",
  );
  const makeForm = (id, format, imageId) => {
    const data = new FormData();
    data.set("requestId", id);
    data.set("email", email);
    data.set("website", "");
    data.set("format", format);
    const content = [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "RELEASE CHECK — no reply required.\nTesting production persistence.",
          },
        ],
      },
    ];
    if (format === "rich") {
      content.push({
        type: "inquiryImage",
        attrs: { id: imageId, width: 280 },
      });
      data.append(
        "images",
        new Blob([image], { type: "image/png" }),
        "release-fixture.png",
      );
    }
    data.set("content", JSON.stringify({ type: "doc", content }));
    return data;
  };
  const send = (body) =>
    fetch(base + "/api/contact", {
      method: "POST",
      headers: { origin: siteOrigin },
      body,
    });
  for (const format of ["plain", "rich"]) {
    const id = randomUUID(),
      imageId = randomUUID();
    const first = await send(makeForm(id, format, imageId));
    assert.equal(
      first.status,
      201,
      `${format} persistence: ${await first.clone().text()}`,
    );
    const receipt = await first.json();
    assert.equal(receipt.reference, id);
    ids.push(id);
    const retry = await send(makeForm(id, format, imageId));
    assert.equal(retry.status, 201);
    assert.equal((await retry.json()).receivedAt, receipt.receivedAt);
    const saved = await client
      .from("anonymous_inquiries_preview")
      .select("id,format,message,content,images")
      .eq("id", id)
      .single();
    assert.ifError(saved.error);
    assert.equal(saved.data.format, format);
    assert.match(saved.data.message, /\nTesting production/);
    if (format === "rich") {
      const attachment = saved.data.images[0];
      assert.equal(saved.data.content.content[1].attrs.width, 280);
      const download = await client.storage
        .from("anonymous-inquiry-images-preview")
        .download(attachment.path);
      assert.ifError(download.error);
      assert.deepEqual(Buffer.from(await download.data.arrayBuffer()), image);
    }
  }
  // Four successful requests above, then the fifth reaches payload validation;
  // the sixth is denied by real distributed protection before parsing or saving.
  assert.equal((await send("invalid multipart")).status, 415);
  const limited = await send("invalid multipart");
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
}
console.log(
  JSON.stringify({
    ok: true,
    productionPages: true,
    archivedRoutesBlocked: paths.length + 5,
    originProtection: true,
    live,
    savedTestIds: ids,
    idempotencyAndPrivateImageVerified: live,
    distributedLimitVerified: live,
  }),
);
