/* Opt-in cloud integration test; never starts a server or overwrites user-filled demo data. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { createClient } = require("@supabase/supabase-js");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const table = "rich_text_single_preview";
const bucket = "anonymous-inquiry-images-preview";
const fixedId = "00000000-0000-4000-8000-000000000001";
const marker = "single-form-browser-test@example.com";

async function main() {
  assert.equal(
    process.env.SINGLE_FORM_LIVE_WRITE,
    "1",
    "Set SINGLE_FORM_LIVE_WRITE=1 to allow replacing the shared TEST document.",
  );
  const origin = process.env.PREVIEW_TEST_ORIGIN || "http://192.168.1.176:3003";
  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const original = await admin
    .from(table)
    .select("form")
    .eq("id", fixedId)
    .maybeSingle();
  assert.ifError(original.error);
  assert.ok(
    !original.data || original.data.form.email === marker,
    "Shared form contains user data; refusing to overwrite it.",
  );
  const artifacts = await fs.mkdtemp(
    path.join(os.tmpdir(), "single-form-preview-"),
  );
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  let previous;
  const versions = [];
  try {
    for (const version of [1, 2]) {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 1000 },
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${origin}/rich-text-preview`);
      const send = page.getByRole("button", {
        name: "保存并替换表单",
        exact: true,
      });
      await page.waitForFunction(
        () => !document.querySelector('button[type="submit"]').disabled,
      );
      await page.getByLabel("联系邮箱").fill(marker);
      const editor = page.getByLabel("咨询内容", { exact: true });
      await editor.fill(`第 ${version} 版测试表单：从 Supabase 读回图文`);
      await editor.press("ControlOrMeta+a");
      await page.getByRole("button", { name: "标题格式", exact: true }).click();
      await page.getByRole("menuitem", { name: "标题 2", exact: true }).click();
      await page.getByRole("button", { name: "加粗", exact: true }).click();
      await page.getByRole("button", { name: "居中", exact: true }).click();
      await editor.press("ControlOrMeta+End");
      await editor.press("Enter");
      const fixture = "docs/ChatGPT_Image_Sep_4,_2026,_03_28_04_PM.png";
      const count = version === 1 ? 2 : 1;
      await page
        .getByLabel("选择咨询图片")
        .setInputFiles(Array(count).fill(fixture));
      await page
        .getByRole("link", { name: `预览图片 ${count}`, exact: true })
        .waitFor();
      await editor.press("ControlOrMeta+End");
      await page.keyboard.insertText(`第 ${version} 版图片后的补充说明。`);
      const blobHashes = await page.evaluate(async () =>
        Promise.all(
          Array.from(
            document.querySelectorAll('a[aria-label^="预览图片"]'),
          ).map(async (a) => {
            const blob = await (await fetch(a.href)).blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve(String(reader.result).split(",")[1]);
              reader.readAsDataURL(blob);
            });
          }),
        ),
      );
      const hashes = blobHashes.map((b) =>
        createHash("sha256").update(Buffer.from(b, "base64")).digest("hex"),
      );
      if (version === 1) {
        // A failed response must keep the editable form and never show a false success.
        await page.route("**/rich-text-preview/submit", (route) =>
          route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: "测试：暂时无法保存，请重试" }),
          }),
        );
        await send.click();
        await page
          .getByRole("alert")
          .filter({ hasText: "测试：暂时无法保存" })
          .waitFor();
        assert.match(await editor.innerText(), /第 1 版/);
        assert.equal(await page.locator("#inquiry-message img").count(), count);
        await page.unroute("**/rich-text-preview/submit");
      }
      const responseWait = page.waitForResponse(
        (r) =>
          r.url().endsWith("/rich-text-preview/submit") &&
          r.request().method() === "POST",
        { timeout: 120000 },
      );
      await send.click();
      const response = await responseWait;
      assert.equal(response.status(), 201);
      const receipt = await response.json();
      assert.equal(receipt.reference, fixedId);
      await page
        .getByRole("heading", { name: "表单已保存", exact: true })
        .waitFor();
      await context.close(); // Destroy all editor state, blob URLs and cookies before preview.

      const readContext = await browser.newContext({
        viewport: { width: 1280, height: 1000 },
      });
      const reader = await readContext.newPage();
      reader.on("pageerror", (e) => errors.push(e.message));
      const html = await reader.goto(`${origin}/rich-text-preview/view`);
      assert.equal(html.status(), 200);
      await reader
        .getByTestId("saved-email")
        .filter({ hasText: marker })
        .waitFor();
      const article = reader.getByRole("article", { name: "已保存正文" });
      assert.match(await article.innerText(), new RegExp(`第 ${version} 版`));
      if (version === 2)
        assert.doesNotMatch(await article.innerText(), /第 1 版/);
      assert.equal(await article.locator("h2 strong").count(), 1);
      assert.equal(
        await article
          .locator("h2")
          .evaluate((el) => getComputedStyle(el).textAlign),
        "center",
      );
      assert.equal(await article.locator("img").count(), count);
      await reader.waitForFunction(() =>
        [...document.querySelectorAll("article img")].every(
          (img) => img.complete && img.naturalWidth > 0,
        ),
      );
      assert.equal(
        await article
          .locator("img")
          .evaluateAll((imgs) =>
            imgs.every(
              (img) =>
                img.src.startsWith("https://") &&
                img.src.includes("/storage/v1/object/sign/"),
            ),
          ),
        true,
      );
      const db = await admin
        .from(table)
        .select("id,form,updated_at", { count: "exact" });
      assert.ifError(db.error);
      assert.equal(db.count, 1);
      const row = db.data[0];
      assert.equal(row.id, fixedId);
      assert.deepEqual(row.form.content, receipt.content);
      assert.equal(row.form.images.length, count);
      assert.doesNotMatch(
        JSON.stringify(row.form),
        /blob:|data:image|signedUrl|\?token=/,
      );
      for (const [index, image] of row.form.images.entries()) {
        assert.ok(image.bytes <= 150 * 1024);
        assert.equal(image.mime, "image/webp");
        const file = await admin.storage.from(bucket).download(image.path);
        assert.ifError(file.error);
        assert.equal(
          createHash("sha256")
            .update(Buffer.from(await file.data.arrayBuffer()))
            .digest("hex"),
          hashes[index],
        );
      }
      if (previous) {
        assert.notEqual(row.form.images[0].path, previous.form.images[0].path);
        const oldImage = await admin.storage
          .from(bucket)
          .download(previous.form.images[0].path);
        assert.ifError(oldImage.error); // No bucket cleanup requested; old files are retained.
      }
      previous = row;
      await reader
        .getByText("看看数据库实际保存了什么（JSON）", { exact: true })
        .click();
      assert.deepEqual(
        JSON.parse(await reader.locator("pre").innerText()),
        row.form,
      );
      await reader
        .getByRole("link", { name: "重新读取最新内容", exact: true })
        .click();
      await reader.getByTestId("saved-email").waitFor();
      await reader.waitForFunction(() =>
        [...document.querySelectorAll("article img")].every(
          (img) => img.complete && img.naturalWidth > 0,
        ),
      );
      await reader.screenshot({
        path: path.join(artifacts, `saved-v${version}.png`),
        fullPage: true,
      });
      await reader.setViewportSize({ width: 375, height: 900 });
      assert.ok(
        await reader.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await reader.screenshot({
        path: path.join(artifacts, `mobile-v${version}.png`),
        fullPage: true,
      });
      versions.push({
        version,
        rows: db.count,
        images: row.form.images.map((image) => ({
          bytes: image.bytes,
          mime: image.mime,
        })),
      });
      await readContext.close();
    }
    const anon = createClient(
      process.env.SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false } },
    );
    assert.ok(
      (await anon.from(table).select("*")).error,
      "Anonymous direct database read must be denied",
    );
    assert.ok(
      (await anon.from(table).upsert(previous)).error,
      "Anonymous direct database write must be denied",
    );
    const publicUrl = anon.storage
      .from(bucket)
      .getPublicUrl(previous.form.images[0].path).data.publicUrl;
    assert.notEqual((await fetch(publicUrl)).status, 200);
    const forged = await fetch(`${origin}/rich-text-preview/submit`, {
      method: "POST",
      headers: { Origin: "https://invalid.example" },
    });
    assert.equal(forged.status, 403);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify(
        {
          ok: true,
          versions,
          freshContexts: true,
          singleRow: true,
          oldFilesRetained: true,
          anonymousDatabaseAccessDenied: true,
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
