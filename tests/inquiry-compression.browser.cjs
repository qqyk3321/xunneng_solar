// Uses existing local server; never submits or writes to Supabase.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const artifacts = await fs.mkdtemp(
    path.join(os.tmpdir(), "inquiry-compression-"),
  );
  const results = [];
  let posts = 0;
  page.on("request", (r) => {
    if (r.method() === "POST") posts++;
  });
  const fixture = await fs.readFile(
    "docs/ChatGPT_Image_Sep_4,_2026,_03_28_04_PM.png",
  );
  try {
    for (const mode of ["diagram", "jpeg-fallback", "noise"]) {
      await page.goto(
        process.env.PREVIEW_TEST_ORIGIN ||
          "http://192.168.1.176:3003/contact-preview",
      );
      await page.locator('#inquiry-message[contenteditable="true"]').waitFor();
      if (mode === "jpeg-fallback")
        await page.evaluate(() => {
          const original = HTMLCanvasElement.prototype.toBlob;
          HTMLCanvasElement.prototype.toBlob = function (
            callback,
            type,
            quality,
          ) {
            return original.call(
              this,
              callback,
              type === "image/webp" ? "image/png" : type,
              quality,
            );
          };
        });
      let buffer = fixture;
      if (mode === "noise") {
        const encoded = await page.evaluate(() => {
          const c = document.createElement("canvas");
          c.width = 1920;
          c.height = 1080;
          const ctx = c.getContext("2d");
          const pixels = ctx.createImageData(c.width, c.height);
          let seed = 123456789;
          for (let i = 0; i < pixels.data.length; i += 4) {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            pixels.data[i] = seed & 255;
            pixels.data[i + 1] = (seed >>> 8) & 255;
            pixels.data[i + 2] = (seed >>> 16) & 255;
            pixels.data[i + 3] = 255;
          }
          ctx.putImageData(pixels, 0, 0);
          return c.toDataURL("image/png").split(",")[1];
        });
        buffer = Buffer.from(encoded, "base64");
      }
      await page
        .getByLabel("选择咨询图片")
        .setInputFiles({ name: `${mode}.png`, mimeType: "image/png", buffer });
      const link = page.getByRole("link", { name: "预览图片 1", exact: true });
      await page.waitForFunction(() => document.querySelector('a[aria-label="预览图片 1"]') || document.querySelector('#inquiry-error'));
      if (await page.locator('#inquiry-error').count()) {
        const message = await page.locator('#inquiry-error').innerText();
        assert.equal(mode, "noise");
        assert.match(message, /超过 150 KB.*清晰度.*裁剪/);
        results.push({ mode, originalBytes: buffer.length, rejectedForReadability: true, message });
        continue;
      }
      await link.waitFor();
      const result = await link.evaluate(async (a) => {
        const blob = await (await fetch(a.href)).blob();
        const img = new Image();
        img.src = a.href;
        await img.decode();
        const base64 = await new Promise((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result).split(",")[1]);
          r.readAsDataURL(blob);
        });
        return {
          size: blob.size,
          type: blob.type,
          width: img.width,
          height: img.height,
          base64,
        };
      });
      assert.ok(result.size <= 150 * 1024);
      assert.ok(Math.max(result.width, result.height) <= 1920);
      assert.equal(
        result.type,
        mode === "jpeg-fallback" ? "image/jpeg" : "image/webp",
      );
      assert.ok(result.size < buffer.length);
      await fs.writeFile(
        path.join(
          artifacts,
          `${mode}.${result.type === "image/webp" ? "webp" : "jpg"}`,
        ),
        Buffer.from(result.base64, "base64"),
      );
      const { base64, ...metrics } = result;
      results.push({
        mode,
        originalBytes: buffer.length,
        ...metrics,
        reduction: `${(100 * (1 - result.size / buffer.length)).toFixed(1)}%`,
      });
    }
    assert.equal(posts, 0);
    await fs.writeFile(
      path.join(artifacts, "report.json"),
      JSON.stringify(results, null, 2),
    );
    console.log(
      JSON.stringify({ results, artifacts, uploads: posts }, null, 2),
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
