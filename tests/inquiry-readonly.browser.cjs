/* Local UI checks + read-only cloud preview. Never saves data or starts a server. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

async function main() {
  const origin = process.env.PREVIEW_TEST_ORIGIN || "http://192.168.1.176:3003";
  const artifacts = await fs.mkdtemp(
    path.join(os.tmpdir(), "inquiry-readonly-"),
  );
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
  });
  const errors = [],
    posts = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  try {
    await page.goto(`${origin}/rich-text-preview`);
    const editor = page.locator('#inquiry-message[contenteditable="true"]');
    await editor.waitFor();
    await editor.fill("Tiptap 共用渲染测试标题");
    await editor.press("ControlOrMeta+a");
    await page.getByRole("button", { name: "标题格式", exact: true }).click();
    await page.getByRole("menuitem", { name: "标题 2", exact: true }).click();
    await page.getByRole("button", { name: "加粗", exact: true }).click();
    await page.getByRole("button", { name: "居中", exact: true }).click();
    await editor.press("ControlOrMeta+End");
    await editor.press("Enter");
    await page
      .getByLabel("选择咨询图片")
      .setInputFiles("docs/ChatGPT_Image_Sep_4,_2026,_03_28_04_PM.png");
    await page.getByRole("link", { name: "预览图片 1", exact: true }).waitFor();
    await editor.press("ControlOrMeta+End");
    await page.keyboard.insertText("图片后的补充说明");
    await page.getByRole("button", { name: "预览排版", exact: true }).click();
    const readonly = page.getByRole("document", {
      name: "富文本只读内容",
      exact: true,
    });
    await readonly.locator("img").waitFor();
    await page.waitForFunction(() =>
      [
        ...document.querySelectorAll(
          ".inquiry-readonly img, #inquiry-message img",
        ),
      ].every((img) => img.complete && img.naturalWidth > 0),
    );
    assert.equal(await readonly.getAttribute("contenteditable"), "false");
    assert.equal(await readonly.locator("h2 strong").count(), 1);
    assert.equal(await page.locator(".inquiry-readonly button").count(), 0);
    // Compare at identical content widths: same nodes, styles and image aspect ratios.
    const dimensions = await page.evaluate(() => {
      const nodes = [
        document.querySelector("#inquiry-message"),
        document.querySelector(".inquiry-readonly .tiptap"),
      ];
      return nodes.map((node) => {
        node.style.width = "400px";
        const img = node.querySelector("img"),
          heading = node.querySelector("h2");
        const r = img.getBoundingClientRect(),
          s = getComputedStyle(node),
          h = getComputedStyle(heading);
        return {
          width: r.width,
          height: r.height,
          naturalRatio: img.naturalWidth / img.naturalHeight,
          fontSize: s.fontSize,
          padding: s.padding,
          alignment: h.textAlign,
          blocks: [...node.children].map((n) => n.tagName),
          text: node.textContent,
        };
      });
    });
    assert.deepEqual(dimensions[0], dimensions[1]);
    assert.ok(
      Math.abs(
        dimensions[0].width / dimensions[0].height - dimensions[0].naturalRatio,
      ) < 0.01,
    );
    await page.evaluate(() =>
      document
        .querySelectorAll("#inquiry-message, .inquiry-readonly .tiptap")
        .forEach((n) => n.style.removeProperty("width")),
    );
    // A live local preview must update after edits and remove/undo image operations.
    await editor.press("ControlOrMeta+End");
    await page.keyboard.insertText("追加的文字");
    await page.waitForFunction(() =>
      document
        .querySelector(".inquiry-readonly .tiptap")
        ?.textContent.includes("追加的文字"),
    );
    await page.getByRole("button", { name: "移除图片 1", exact: true }).click();
    await page.waitForFunction(
      () => !document.querySelector(".inquiry-readonly img"),
    );
    await page.getByRole("button", { name: "撤销", exact: true }).click();
    await readonly.locator("img").waitFor();
    const before = await readonly.innerHTML();
    await readonly.click();
    await page.keyboard.type("must-not-edit");
    await page.keyboard.press("Backspace");
    await readonly.evaluate((el) => {
      const transfer = new DataTransfer();
      transfer.setData("text/plain", "must-not-paste-or-drop");
      el.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: transfer,
          bubbles: true,
          cancelable: true,
        }),
      );
      el.dispatchEvent(
        new DragEvent("drop", {
          dataTransfer: transfer,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    assert.equal(await readonly.innerHTML(), before);
    assert.deepEqual(posts, []);
    await page.screenshot({
      path: path.join(artifacts, "editor-and-readonly.png"),
      fullPage: true,
    });
    await page.close();

    const context = await browser.newContext({
      viewport: { width: 1280, height: 1000 },
    });
    const savedPage = await context.newPage();
    savedPage.on("pageerror", (e) => errors.push(e.message));
    await savedPage.goto(`${origin}/rich-text-preview/view`);
    const saved = savedPage.getByRole("document", {
      name: "富文本只读内容",
      exact: true,
    });
    await saved.waitFor();
    assert.equal(await saved.getAttribute("contenteditable"), "false");
    await savedPage.waitForFunction(() =>
      [...document.querySelectorAll("article img")].every(
        (img) => img.complete && img.naturalWidth > 0,
      ),
    );
    assert.equal(
      await saved
        .locator("img")
        .evaluateAll(
          (imgs) =>
            imgs.length > 0 &&
            imgs.every(
              (img) =>
                img.src.startsWith("https://") &&
                img.src.includes("/storage/v1/object/sign/"),
            ),
        ),
      true,
    );
    const savedBefore = await saved.innerHTML();
    await saved.click();
    await savedPage.keyboard.type("must-not-edit");
    assert.equal(await saved.innerHTML(), savedBefore);
    await savedPage.screenshot({
      path: path.join(artifacts, "saved-readonly.png"),
      fullPage: true,
    });
    for (const width of [320, 375, 768]) {
      await savedPage.setViewportSize({ width, height: 900 });
      assert.ok(
        await savedPage.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.ok(
        await saved
          .locator("img")
          .evaluateAll((imgs) =>
            imgs.every(
              (img) =>
                Math.abs(
                  img.width / img.height - img.naturalWidth / img.naturalHeight,
                ) < 0.02,
            ),
          ),
      );
    }
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify(
        {
          ok: true,
          sameRendering: true,
          readOnly: true,
          liveUpdates: true,
          savedCloudImages: true,
          noWrites: true,
          dimensions,
          artifacts,
        },
        null,
        2,
      ),
    );
    await context.close();
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
