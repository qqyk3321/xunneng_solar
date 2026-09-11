/* Browser smoke test. Never starts a server. Live writes require explicit opt-in. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { createClient } = require("@supabase/supabase-js");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");

async function main() {
  const origin = process.env.PREVIEW_TEST_ORIGIN || "http://192.168.1.176:3003";
  const live = process.env.INQUIRY_LIVE_WRITE === "1";
  const artifacts = await fs.mkdtemp(
    path.join(os.tmpdir(), "anonymous-inquiry-test-"),
  );
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const receipts = [];
  try {
    await page.goto(`${origin}/contact-preview`);
    const send = page.getByRole("button", { name: "发送咨询", exact: true });
    await send.waitFor();
    await page.waitForFunction(
      () => !document.querySelector('button[type="submit"]').disabled,
    );
    await page.locator('#inquiry-message[contenteditable="true"]').waitFor();
    await send.click();
    await page
      .getByRole("alert")
      .filter({ hasText: "有效的联系邮箱" })
      .waitFor();
    await page.getByLabel("联系邮箱").fill("inquiry-smoke@example.com");
    await send.click();
    await page.getByRole("alert").filter({ hasText: "5–5000" }).waitFor();
    await page
      .getByLabel("咨询内容", { exact: false })
      .fill(
        "自动测试：匿名咨询纯文本。无需发送邮件。<script>alert('not executable')</script>",
      );
    await page.getByLabel("咨询内容", { exact: true }).press("ControlOrMeta+a");
    await page.getByRole("button", { name: "加粗", exact: true }).click();
    assert.equal(await page.locator("#inquiry-message strong").count(), 1);
    await page.getByRole("button", { name: "标题格式", exact: true }).click();
    await page.getByRole("menuitem", { name: "标题 2", exact: true }).click();
    await page.getByRole("button", { name: "居中", exact: true }).click();
    await page.screenshot({
      path: path.join(artifacts, "desktop.png"),
      fullPage: true,
    });
    if (live) {
      const wait = page.waitForResponse(
        (r) =>
          r.url().endsWith("/contact-preview/submit") &&
          r.request().method() === "POST",
      );
      await send.click();
      const response = await wait;
      assert.equal(response.status(), 201);
      receipts.push(await response.json());
      await page.getByRole("heading", { name: "留言已收到" }).waitFor();
      assert.equal(await page.locator("details strong").count(), 1);
      assert.equal(await page.locator("details h2").evaluate(el => getComputedStyle(el).textAlign), "center");
      assert.equal(await page.locator("details script").count(), 0);
      await page.screenshot({
        path: path.join(artifacts, "success.png"),
        fullPage: true,
      });
      await page.getByRole("button", { name: "再写一条留言" }).click();
    }
    // Default mode never posts, including form retries.
    await page.getByLabel("联系邮箱").fill("inquiry-images@example.com");
    await page
      .getByLabel("咨询内容", { exact: false })
      .fill("自动测试：附图匿名咨询，验证响应丢失后的安全重试，不发送邮件。");
    await page
      .getByLabel("咨询内容", { exact: true })
      .press("ControlOrMeta+End");
    await page.getByLabel("咨询内容", { exact: true }).press("Enter");
    const input = page.getByLabel("选择咨询图片");
    await input.setInputFiles({
      name: "fake.png",
      mimeType: "image/png",
      buffer: Buffer.from("not a png"),
    });
    await page.getByRole("alert").filter({ hasText: "仅支持" }).waitFor();
    const fixture = "docs/ChatGPT_Image_Sep_4,_2026,_03_28_04_PM.png";
    await input.setInputFiles(fixture);
    await page.getByRole("link", { name: "预览图片 1", exact: true }).waitFor();
    await page.getByRole("button", { name: "移除图片 1" }).click();
    assert.equal(
      await page.getByRole("link", { name: "预览图片 1", exact: true }).count(),
      0,
    );
    await page.getByRole("button", { name: "撤销", exact: true }).click();
    await page.getByRole("link", { name: "预览图片 1", exact: true }).waitFor();
    assert.equal(
      await page
        .locator("#inquiry-message img")
        .evaluateAll((imgs) =>
          imgs.every((img) => img.complete && img.naturalWidth > 0),
        ),
      true,
    );
    await page.getByRole("button", { name: "重做", exact: true }).click();
    assert.equal(
      await page.getByRole("link", { name: "预览图片 1", exact: true }).count(),
      0,
    );
    await input.setInputFiles([fixture, fixture]);
    await page.getByRole("link", { name: "预览图片 2", exact: true }).waitFor();
    const editor = page.getByLabel("咨询内容", { exact: true });
    await editor.press("ControlOrMeta+End");
    await page.keyboard.insertText("这是图片后面的说明文字");
    await editor.press("Enter");
    await page.getByRole("button", { name: "列表格式", exact: true }).click();
    await page.getByRole("menuitem", { name: "有序列表", exact: true }).click();
    await page.keyboard.insertText("第一个补充问题");
    await editor.press("Enter");
    await page.keyboard.insertText("第二个补充问题");
    await editor.press("Enter");
    await editor.press("Enter");
    await page.getByRole("button", { name: "引用", exact: true }).click();
    await page.getByRole("button", { name: "斜体", exact: true }).click();
    await page.keyboard.insertText("这是引用说明");
    await page.getByRole("button", { name: "斜体", exact: true }).click();
    await page.getByRole("button", { name: "预览排版", exact: true }).click();
    const preview = page.getByLabel("富文本排版预览");
    assert.equal(await preview.locator("img").count(), 2);
    assert.equal(await preview.locator("ol li").count(), 2);
    assert.equal(await preview.locator("blockquote em").count(), 1);
    const bytes = await page.evaluate(async () =>
      Promise.all(
        Array.from(document.querySelectorAll('a[aria-label^="预览图片"]')).map(
          async (a) => {
            const blob = await (await fetch(a.href)).blob();
            return await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve(String(reader.result).split(",")[1]);
              reader.readAsDataURL(blob);
            });
          },
        ),
      ),
    );
    const hashes = bytes.map((b) =>
      createHash("sha256").update(Buffer.from(b, "base64")).digest("hex"),
    );
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `overflow ${width}`,
      );
      if (width === 375)
        await page.screenshot({
          path: path.join(artifacts, "mobile.png"),
          fullPage: true,
        });
    }
    if (live) {
      let actualReceipt;
      await page.route(
        "**/contact-preview/submit",
        async (route) => {
          const response = await route.fetch();
          assert.equal(response.status(), 201);
          actualReceipt = await response.json();
          // Simulate a lost receipt after the server has committed the inquiry.
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({
              error: "测试：提交确认丢失，请保留内容重试。",
            }),
          });
        },
        { times: 1 },
      );
      await send.click();
      await page
        .getByRole("alert")
        .filter({ hasText: "提交确认丢失" })
        .waitFor();
      assert.equal(
        await page
          .getByRole("link", { name: "预览图片 2", exact: true })
          .count(),
        1,
      );
      assert.match(
        await page.getByLabel("咨询内容", { exact: true }).innerText(),
        /附图匿名咨询/,
      );
      const wait = page.waitForResponse(
        (r) =>
          r.url().endsWith("/contact-preview/submit") &&
          r.request().method() === "POST",
      );
      await send.click();
      const response = await wait;
      assert.equal(response.status(), 201);
      const retryReceipt = await response.json();
      assert.deepEqual(retryReceipt, actualReceipt);
      receipts.push(retryReceipt);
      await page.getByRole("heading", { name: "留言已收到" }).waitFor();
      const client = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } },
      );
      const rows = await client
        .from("anonymous_inquiries_preview")
        .select("id,email,message,images,content")
        .in(
          "id",
          receipts.map((r) => r.reference),
        );
      assert.equal(rows.error, null);
      assert.equal(rows.data.length, 2);
      const original = rows.data.find((r) => r.id === receipts[0].reference);
      assert.equal(original.images.length, 0);
      assert.match(original.message, /<script>/);
      assert.deepEqual(original.content, receipts[0].content);
      assert.deepEqual(original.content.content[0].attrs, { level: 2, textAlign: "center" });
      const row = rows.data.find((r) => r.id === retryReceipt.reference);
      assert.equal(row.email, "inquiry-images@example.com");
      assert.equal(row.images.length, 2);
      assert.deepEqual(row.content, retryReceipt.content);
      assert.doesNotMatch(
        JSON.stringify(row.content),
        /blob:|data:|https?:|<img/,
      );
      const docImages = row.content.content.filter(
        (n) => n.type === "inquiryImage",
      );
      assert.deepEqual(
        docImages.map((n) => n.attrs.id),
        row.images.map((i) => i.id),
      );
      assert.equal(await page.locator("details ol li").count(), 2);
      assert.equal(await page.locator("details blockquote em").count(), 1);
      const imageIndex = row.content.content.findIndex(
        (n) => n.type === "inquiryImage",
      );
      assert.ok(imageIndex > 0);
      assert.match(
        JSON.stringify(row.content.content.slice(imageIndex + 2)),
        /这是图片后面的说明文字/,
      );
      await page.screenshot({
        path: path.join(artifacts, "rich-saved.png"),
        fullPage: true,
      });
      for (let index = 0; index < row.images.length; index++) {
        const attachment = row.images[index];
        const download = await client.storage
          .from("anonymous-inquiry-images-preview")
          .download(attachment.path);
        assert.equal(download.error, null);
        assert.equal(
          createHash("sha256")
            .update(Buffer.from(await download.data.arrayBuffer()))
            .digest("hex"),
          hashes[index],
        );
        const publicUrl = client.storage
          .from("anonymous-inquiry-images-preview")
          .getPublicUrl(attachment.path).data.publicUrl;
        assert.equal((await fetch(publicUrl)).ok, false);
      }
      const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        { auth: { persistSession: false } },
      );
      assert.ok(
        (await anon.from("anonymous_inquiries_preview").select("*")).error,
      );
      assert.ok(
        (
          await anon.from("anonymous_inquiries_preview").insert({
            id: "e240751b-15e5-490b-b613-ad659b862261",
            email: "denied@example.com",
            message: "must not save",
            payload_hash: "a".repeat(64),
          })
        ).error,
      );
    }
    // A fresh draft tests clipboard HTML sanitation and local screenshot pasting, without posting.
    await page.reload();
    const pastedEditor = page.locator(
      '#inquiry-message[contenteditable="true"]',
    );
    await pastedEditor.waitFor();
    await pastedEditor.focus();
    await pastedEditor.evaluate((el) => {
      const data = new DataTransfer();
      data.setData(
        "text/html",
        '<p><strong>粘贴的加粗问题</strong><script>window.__inquiryUnsafe = true</script><img src="https://invalid.example/tracker.png" onerror="window.__inquiryUnsafe = true"><a href="javascript:alert(1)">不保留链接</a></p>',
      );
      el.dispatchEvent(
        new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: data,
        }),
      );
    });
    assert.equal(
      await pastedEditor.locator("strong").innerText(),
      "粘贴的加粗问题",
    );
    assert.equal(await pastedEditor.locator("script,img,a").count(), 0);
    assert.equal(await page.evaluate(() => window.__inquiryUnsafe), undefined);
    const pngBase64 = (
      await fs.readFile("docs/ChatGPT_Image_Sep_4,_2026,_03_28_04_PM.png")
    ).toString("base64");
    await pastedEditor.evaluate((el, base64) => {
      const data = new DataTransfer();
      data.items.add(
        new File(
          [Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))],
          "clipboard.png",
          { type: "image/png" },
        ),
      );
      el.dispatchEvent(
        new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: data,
        }),
      );
    }, pngBase64);
    await page.getByRole("link", { name: "预览图片 1", exact: true }).waitFor();
    assert.equal(await pastedEditor.locator("img").count(), 1);
    await pastedEditor.press("ControlOrMeta+Home");
    await page.getByRole("button", { name: "标题格式", exact: true }).click();
    await page.getByRole("menuitem", { name: "标题 2", exact: true }).click();
    await page.getByRole("button", { name: "居中", exact: true }).click();
    await page.getByRole("button", { name: "预览排版", exact: true }).click();
    const savedHeading = page.getByLabel("富文本排版预览").locator("h2");
    assert.equal(await savedHeading.count(), 1);
    assert.equal(
      await savedHeading.evaluate((el) => getComputedStyle(el).textAlign),
      "center",
    );
    await page.screenshot({
      path: path.join(artifacts, "official-editor.png"),
      fullPage: true,
    });
    // Official editor styles must not change the homepage after client-side navigation.
    const home = await browser.newPage();
    await home.goto(origin);
    const bodyStyle = () => {
      const s = getComputedStyle(document.body);
      return [s.fontFamily, s.fontSize, s.color, s.backgroundColor, s.lineHeight];
    };
    const baseline = await home.evaluate(bodyStyle);
    await page.getByRole("link", { name: "Sol & Tide Energy", exact: true }).click();
    await page.waitForURL(origin + "/");
    assert.deepEqual(await page.evaluate(bodyStyle), baseline);
    await home.close();
    assert.deepEqual(errors, []);
    await fs.writeFile(
      path.join(artifacts, "report.json"),
      JSON.stringify(
        {
          live,
          receipts,
          browser: browser.version(),
          checks: [
            "field validation",
            "invalid image rejection",
            "remove and preview compressed images",
            "responsive layout",
            ...(live
              ? [
                  "real text and image persistence",
                  "lost-response retry is idempotent",
                  "cloud SHA256 matches browser",
                  "private image access",
                  "anonymous table read/write denied",
                ]
              : []),
          ],
        },
        null,
        2,
      ),
    );
    console.log(
      `PASS anonymous inquiry browser checks (${live ? "real Supabase writes" : "local-only"}). Artifacts: ${artifacts}`,
    );
  } catch (error) {
    await page
      .screenshot({ path: path.join(artifacts, "failure.png"), fullPage: true })
      .catch(() => {});
    console.error(`Artifacts: ${artifacts}`);
    throw error;
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
