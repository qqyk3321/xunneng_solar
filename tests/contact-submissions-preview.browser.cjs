/* Read-only live test. Uses existing saved messages; never submits, deletes or starts a server. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { createClient } = require("@supabase/supabase-js");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

async function main() {
  const origin = process.env.PREVIEW_TEST_ORIGIN || "http://192.168.1.176:3003";
  const root = `${origin}/contact-submissions-preview`;
  const artifacts = await fs.mkdtemp(
    path.join(os.tmpdir(), "contact-submissions-"),
  );
  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const db = await admin
    .from("anonymous_inquiries_preview")
    .select("id,email,created_at,format,message,content,images")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });
  assert.ifError(db.error);
  assert.ok(
    db.data.length > 0,
    "Existing test messages are required; this test does not create records",
  );
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
  });
  const errors = [],
    writes = [];
  const watch = (page) => {
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (
        ["POST", "PUT", "PATCH", "DELETE"].includes(request.method()) &&
        request.url().startsWith(origin)
      )
        writes.push(request.url());
    });
  };
  watch(page);
  try {
    const response = await page.goto(root, { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), 200);
    assert.match(response.headers()["cache-control"], /no-store/);
    await page
      .getByRole("heading", { name: "Contact submissions", exact: true })
      .waitFor();
    const ids = () =>
      page
        .locator("tbody tr")
        .evaluateAll((rows) => rows.map((row) => row.dataset.submissionId));
    assert.deepEqual(
      await ids(),
      db.data.slice(0, 10).map((row) => row.id),
    );
    assert.match(
      await page.getByTestId("submission-count").innerText(),
      new RegExp(`^${db.data.length} submissions?$`),
    );
    if (db.data.length > 10) {
      await page.getByRole("link", { name: "Next", exact: true }).click();
      await page.waitForURL(/page=2/);
      await page
        .getByText(`Page 2 of ${Math.ceil(db.data.length / 10)}`, {
          exact: true,
        })
        .waitFor();
      assert.deepEqual(
        await ids(),
        db.data.slice(10, 20).map((row) => row.id),
      );
    }
    const ascending = await admin
      .from("anonymous_inquiries_preview")
      .select("id")
      .order("email", { ascending: true })
      .order("id", { ascending: true })
      .limit(10);
    assert.ifError(ascending.error);
    await page
      .getByRole("link", {
        name: "Sort by email address ascending",
        exact: true,
      })
      .click();
    await page.waitForURL(/sort=email&direction=asc/);
    await page.locator('th[aria-sort="ascending"]').waitFor();
    assert.deepEqual(
      await ids(),
      ascending.data.map((row) => row.id),
    );
    await page
      .getByRole("link", {
        name: "Sort by submitted at ascending",
        exact: true,
      })
      .click();
    await page.waitForURL(/sort=created_at&direction=asc/);
    const oldest = await admin
      .from("anonymous_inquiries_preview")
      .select("id")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(10);
    assert.ifError(oldest.error);
    assert.deepEqual(
      await ids(),
      oldest.data.map((row) => row.id),
    );
    await page
      .getByRole("link", {
        name: "Sort by submitted at descending",
        exact: true,
      })
      .click();
    await page.waitForURL(/direction=desc/);
    await page.getByLabel("Rows per page").selectOption("25");
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await page.waitForURL(/size=25/);
    await page.getByTestId("submission-count").waitFor();
    assert.deepEqual(
      await ids(),
      db.data.slice(0, 25).map((row) => row.id),
    );
    await page.screenshot({
      path: path.join(artifacts, "list-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 375, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.ok(
      await page
        .getByRole("region", { name: "Scrollable submissions table" })
        .evaluate((el) => el.scrollWidth > el.clientWidth),
    );
    await page.screenshot({
      path: path.join(artifacts, "list-mobile.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 1000 });
    const examples = [
      db.data.find((row) => row.format === "plain"),
      db.data.find((row) => row.format === "rich" && row.images.length),
      db.data.find(
        (row) => row.format === null && !row.content && row.images.length,
      ),
      db.data.find((row) => row.format === null && row.content),
    ].filter(Boolean);
    for (const row of examples) {
      const link = page
        .locator(`tr[data-submission-id="${row.id}"]`)
        .getByRole("link", { name: /^Preview submission/ });
      const [preview] = await Promise.all([
        page.waitForEvent("popup"),
        link.click(),
      ]);
      watch(preview);
      await preview
        .getByRole("heading", { name: "Submission preview", exact: true })
        .waitFor();
      assert.equal(
        await preview.getByTestId("saved-email").innerText(),
        row.email,
      );
      assert.equal(
        await preview.locator("time").getAttribute("datetime"),
        row.created_at,
      );
      assert.equal(
        await preview.getByRole("main").getByRole("alert").count(),
        0,
      );
      const article = preview.getByRole("article", { name: "Saved message" });
      if (row.format === "plain" || !row.content)
        assert.ok((await article.innerText()).includes(row.message));
      else {
        const document = preview.getByRole("document", {
          name: "Read-only message",
        });
        await document.waitFor();
        assert.equal(await document.getAttribute("contenteditable"), "false");
        assert.equal(
          await article.locator("[data-resize-handle],button").count(),
          0,
        );
        const before = await document.innerText();
        await document.click();
        await preview.keyboard.type("must-not-change");
        assert.equal(await document.innerText(), before);
      }
      assert.equal(await article.locator("img").count(), row.images.length);
      for (const img of await article.locator("img").all()) {
        await img.evaluate((image) => image.decode());
        assert.match(
          await img.getAttribute("src"),
          /\/storage\/v1\/object\/sign\//,
        );
      }
      if (row.format === "rich") {
        const savedWidth = row.content.content.find(
          (node) => node.type === "inquiryImage",
        )?.attrs.width;
        if (savedWidth)
          assert.ok(
            Math.abs(
              (await article.locator("img").first().boundingBox()).width -
                savedWidth,
            ) < 2,
          );
        await preview.screenshot({
          path: path.join(artifacts, "rich-preview.png"),
          fullPage: true,
        });
        await preview.setViewportSize({ width: 375, height: 900 });
        assert.ok(
          await preview.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await preview.screenshot({
          path: path.join(artifacts, "rich-preview-mobile.png"),
          fullPage: true,
        });
      }
      assert.match(
        await preview
          .getByRole("link", { name: "Back to submissions" })
          .getAttribute("href"),
        /size=25/,
      );
      await preview.close();
      const beforeUrl = page.url();
      const beforeRows = await ids();
      const quick = page
        .locator(`tr[data-submission-id="${row.id}"]`)
        .getByRole("button", { name: /^Quick preview submission/ });
      await quick.click();
      const modal = page.getByRole("dialog", {
        name: "Submission preview",
        exact: true,
      });
      await modal.getByTestId("saved-email").waitFor();
      assert.equal(
        await modal.getByTestId("saved-email").innerText(),
        row.email,
      );
      assert.equal(page.url(), beforeUrl);
      assert.equal(
        await page.evaluate(() => document.body.style.overflow),
        "hidden",
      );
      assert.equal(await modal.getByRole("alert").count(), 0);
      if (row.format !== "plain" && row.content) {
        await modal
          .getByRole("document", { name: "Read-only message" })
          .waitFor();
        assert.equal(
          await modal.getByRole("document").getAttribute("contenteditable"),
          "false",
        );
      }
      for (const img of await modal.locator("img").all())
        await img.evaluate((image) => image.decode());
      assert.equal(await modal.locator("img").count(), row.images.length);
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press("Tab");
        assert.ok(
          await modal.evaluate((el) => el.contains(document.activeElement)),
          "Focus stays in modal",
        );
      }
      if (row.format === "rich") {
        await page.screenshot({
          path: path.join(artifacts, "modal-desktop.png"),
        });
        await page.setViewportSize({ width: 375, height: 900 });
        assert.ok(
          await modal.evaluate((el) => el.scrollWidth <= el.clientWidth),
          "Modal fits phone screen",
        );
        await page.screenshot({
          path: path.join(artifacts, "modal-mobile.png"),
        });
        await page.setViewportSize({ width: 1280, height: 1000 });
      }
      await page.keyboard.press("Escape");
      await modal.waitFor({ state: "hidden" });
      assert.notEqual(
        await page.evaluate(() => document.body.style.overflow),
        "hidden",
      );
      assert.ok(
        await quick.evaluate((el) => el === document.activeElement),
        "Focus returns to trigger",
      );
      assert.equal(page.url(), beforeUrl);
      assert.deepEqual(await ids(), beforeRows);
    }
    // A transient failure is retryable; closing does not navigate or mutate records.
    const first = examples[0];
    const dataUrl = `${root}/${first.id}/data`;
    await page.route(
      dataUrl,
      (route) =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Test outage" }),
        }),
      { times: 1 },
    );
    const firstQuick = page
      .locator(`tr[data-submission-id="${first.id}"]`)
      .getByRole("button", { name: /^Quick preview submission/ });
    await firstQuick.click();
    const modal = page.getByRole("dialog", {
      name: "Submission preview",
      exact: true,
    });
    await modal.getByRole("alert").waitFor();
    await modal.getByRole("button", { name: "Try again", exact: true }).click();
    await modal.getByTestId("saved-email").waitFor();
    await modal
      .getByRole("button", { name: "Close preview", exact: true })
      .click();
    await modal.waitFor({ state: "hidden" });
    await firstQuick.click();
    await modal.waitFor();
    await page.mouse.click(2, 2);
    await modal.waitFor({ state: "hidden" });
    await page.goto(`${root}?page=999999`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(
      new RegExp(`page=${Math.ceil(db.data.length / 10)}&`),
    );
    assert.ok((await ids()).length > 0);
    await page.goto(`${root}/not-a-valid-id`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("heading", { name: "Submission not found" }).waitFor();
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    console.log(
      JSON.stringify(
        {
          ok: true,
          liveReadOnly: true,
          submissions: db.data.length,
          previewTypesChecked: examples.length,
          pagination: true,
          sorting: true,
          privatePhotosLoaded: true,
          modalPreview: true,
          modalRetryAndClose: true,
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
