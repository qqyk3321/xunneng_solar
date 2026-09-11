/* Downloads existing test records only. Does not mutate Supabase or start a server. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { createClient } = require("@supabase/supabase-js");
const {
  extractMessage,
} = require("../lib/contact-submissions-preview/export.ts");
const {
  parseSubmission,
} = require("../lib/contact-submissions-preview/model.ts");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

async function main() {
  const origin = process.env.PREVIEW_TEST_ORIGIN || "http://192.168.1.176:3003";
  const root = `${origin}/contact-submissions-preview`;
  const artifacts = await fs.mkdtemp(
    path.join(os.tmpdir(), "contact-download-"),
  );
  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const result = await admin
    .from("anonymous_inquiries_preview")
    .select("id,email,created_at,format,message,content,images")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(25);
  assert.ifError(result.error);
  const examples = [
    result.data.find((row) => row.format === "plain"),
    result.data.find((row) => row.format === "rich" && row.images.length),
  ].filter(Boolean);
  assert.equal(
    examples.length,
    2,
    "Existing plain and rich test messages are required",
  );
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const errors = [],
    writes = [],
    downloads = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      request.url().startsWith(origin) &&
      ["POST", "PATCH", "PUT", "DELETE"].includes(request.method())
    )
      writes.push(request.url());
  });
  page.on("download", (file) => downloads.push(file.suggestedFilename()));
  async function download(scope, format, suffix = "") {
    await scope
      .getByRole("button", { name: "Download submission", exact: true })
      .click();
    const name =
      format === "json" ? "Original JSON (.json)" : "Text & image links (.txt)";
    const [file] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("menuitem", { name, exact: true }).click(),
    ]);
    const target = path.join(artifacts, suffix + file.suggestedFilename());
    await file.saveAs(target);
    return fs.readFile(target, "utf8");
  }
  try {
    await page.goto(`${root}?size=25`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("submission-count").waitFor();
    const listUrl = page.url();
    for (const row of examples) {
      const scope = page.locator(`tr[data-submission-id="${row.id}"]`);
      const json = await download(scope, "json");
      assert.deepEqual(
        JSON.parse(json),
        row,
        "Original database fields round-trip unchanged",
      );
      const text = await download(scope, "text");
      assert.ok(text.includes(`Email: ${row.email}\n`));
      assert.ok(text.includes(`Submitted at (UTC): ${row.created_at}\n`));
      const imageUrls = {};
      for (const match of text.matchAll(
        /\[Image (\d+)\]\n(https:\/\/[^\r\n]+)/g,
      )) {
        const image = row.images[Number(match[1]) - 1];
        assert.ok(image);
        imageUrls[image.id] = match[2];
        assert.match(match[2], /\/storage\/v1\/object\/sign\//);
        assert.equal((await page.request.get(match[2])).status(), 200);
      }
      assert.equal(Object.keys(imageUrls).length, row.images.length);
      const expected = extractMessage({
        submission: parseSubmission(row),
        imageUrls,
        missingImages: 0,
      });
      assert.equal(
        text.slice(text.indexOf("\n\nMessage:\n") + "\n\nMessage:\n".length),
        expected + "\n",
      );
      assert.equal(page.url(), listUrl);
    }
    const rich = examples.find((row) => row.format === "rich");
    const richRow = page.locator(`tr[data-submission-id="${rich.id}"]`);
    await richRow
      .getByRole("button", { name: /^Quick preview submission/ })
      .click();
    const modal = page.getByRole("dialog", { name: "Submission preview" });
    await modal.getByTestId("saved-email").waitFor();
    await modal
      .getByRole("button", { name: "Download submission", exact: true })
      .click();
    await modal.getByRole("menu", { name: "Download options" }).waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("menu").waitFor({ state: "hidden" });
    assert.ok(
      await modal.isVisible(),
      "Escape closes the download menu before the modal",
    );
    assert.match(
      await download(modal, "text", "modal-"),
      /expire approximately one hour/,
    );
    await page.setViewportSize({ width: 375, height: 900 });
    await modal
      .getByRole("button", { name: "Download submission", exact: true })
      .click();
    const menu = page.getByRole("menu", { name: "Download options" });
    await menu.waitFor();
    const bounds = await menu.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 375);
    await page.screenshot({
      path: path.join(artifacts, "mobile-download-menu.png"),
    });
    await page.keyboard.press("Escape");
    await modal.getByRole("button", { name: "Close preview" }).click();
    await modal.waitFor({ state: "hidden" });
    assert.equal(page.url(), listUrl);
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto(`${root}/${rich.id}`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("saved-email").waitFor();
    assert.deepEqual(JSON.parse(await download(page, "json", "page-")), rich);
    const count = downloads.length;
    await page.route(
      `${root}/${rich.id}/download?format=json`,
      (route) =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: '{"error":"Test outage"}',
        }),
      { times: 1 },
    );
    await page
      .getByRole("button", { name: "Download submission", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "Original JSON (.json)", exact: true })
      .click();
    await page
      .getByRole("main")
      .getByRole("alert")
      .filter({ hasText: "Download unavailable" })
      .waitFor();
    assert.equal(
      downloads.length,
      count,
      "An error response is not saved as a file",
    );
    assert.deepEqual(JSON.parse(await download(page, "json", "retry-")), rich);
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    console.log(
      JSON.stringify(
        {
          ok: true,
          liveReadOnly: true,
          filesDownloaded: downloads.length,
          rawJsonMatchesDatabase: true,
          lineBreaksPreserved: true,
          signedLinksWork: true,
          allThreeDownloadEntrypoints: true,
          retryWorks: true,
          artifacts,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
