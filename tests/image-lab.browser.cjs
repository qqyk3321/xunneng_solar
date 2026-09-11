/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node browser test. */
// Uses an existing server. Set IMAGE_LAB_LIVE_UPLOAD=1 to explicitly enable cloud writes.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.PREVIEW_TEST_ORIGIN || "http://192.168.1.176:3003";
const live = process.env.IMAGE_LAB_LIVE_UPLOAD === "1";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

(async () => {
  const artifacts = fs.mkdtempSync(
    path.join(os.tmpdir(), "image-lab-results-"),
  );
  const browser = await chromium.launch({ headless: true });
  const report = {
    browser: await browser.version(),
    liveUploads: live,
    cases: [],
    checks: [],
  };
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let uploadRequests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/image-upload-preview/upload"))
        uploadRequests++;
    });
    // Capture tiny JSON receipts in-page; Chromium may evict inspector response
    // bodies while processing large image blobs. This does not mock uploads.
    await page.addInitScript(() => {
      window.__imageLabUploads = [];
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        if (String(args[0]).endsWith("/image-upload-preview/upload")) {
          try {
            window.__imageLabUploads.push(await response.clone().json());
          } catch {
            /* tested via UI error */
          }
        }
        return response;
      };
    });
    assert.equal(
      (
        await page.goto(base + "/image-upload-preview", {
          waitUntil: "domcontentloaded",
        })
      ).status(),
      200,
    );
    assert.equal(await page.getByRole("dialog").count(), 0);
    const fileInput = page.getByLabel("选择测试图片");
    const cases = [
      {
        name: "diagram-png-webp",
        file: path.resolve(
          __dirname,
          "../docs/ChatGPT_Image_Sep_4,_2026,_03_28_04_PM.png",
        ),
        format: "image/webp",
        resize: true,
      },
    ];
    if (process.env.IMAGE_LAB_PHOTO) {
      cases.push({
        name: "photo-webp-resize",
        file: process.env.IMAGE_LAB_PHOTO,
        format: "image/webp",
        resize: true,
      });
      cases.push({
        name: "photo-jpeg-quality-only",
        file: process.env.IMAGE_LAB_PHOTO,
        format: "image/jpeg",
        resize: false,
      });
    }
    for (const scenario of cases) {
      console.log("BEGIN " + scenario.name);
      // Fresh page releases previous object URLs and avoids recomputing for each control change.
      await page.goto(base + "/image-upload-preview", {
        waitUntil: "domcontentloaded",
      });
      await page.getByLabel("压缩输出格式").selectOption(scenario.format);
      await page
        .getByRole("checkbox", { name: "同时限制长边尺寸" })
        .setChecked(scenario.resize);
      uploadRequests = 0;
      await fileInput.setInputFiles(scenario.file);
      await page.waitForFunction(
        () => document.querySelectorAll("[data-variant]").length === 4,
        null,
        { timeout: 60000 },
      );
      assert.equal(uploadRequests, 0, "selection must not upload anything");
      const local = await page
        .locator("[data-variant]")
        .evaluateAll(async (cards) =>
          Promise.all(
            cards.map(async (card) => {
              const img = card.querySelector("img");
              await img.decode();
              const blob = await (await fetch(img.src)).blob();
              const data = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(",")[1]);
                reader.readAsDataURL(blob);
              });
              return {
                id: card.dataset.variant,
                bytes: blob.size,
                mime: blob.type,
                width: img.naturalWidth,
                height: img.naturalHeight,
                encode: card.querySelectorAll("dd")[2].textContent,
                data,
              };
            }),
          ),
        );
      const originalHash = sha(fs.readFileSync(scenario.file));
      assert.equal(sha(Buffer.from(local[0].data, "base64")), originalHash);
      for (const item of local.slice(1)) {
        assert.equal(item.mime, scenario.format);
        assert.ok(
          item.width <= local[0].width && item.height <= local[0].height,
        );
        if (!scenario.resize)
          assert.deepEqual(
            [item.width, item.height],
            [local[0].width, local[0].height],
          );
      }
      await page.screenshot({
        path: path.join(artifacts, scenario.name + ".png"),
        fullPage: true,
      });
      const record = {
        name: scenario.name,
        variants: local.map((item) => ({
          id: item.id,
          bytes: item.bytes,
          mime: item.mime,
          width: item.width,
          height: item.height,
          encode: item.encode,
          reductionPercent: +(100 * (1 - item.bytes / local[0].bytes)).toFixed(
            2,
          ),
        })),
      };
      if (live) {
        await page
          .getByRole("button", { name: "上传全部待上传版本", exact: true })
          .click();
        await page.waitForFunction(
          () =>
            Array.from(
              document.querySelectorAll("[data-variant] button"),
            ).filter((el) => el.textContent === "已上传").length === 4 ||
            document.querySelector('main [role="alert"]'),
          null,
          { timeout: 180000 },
        );
        assert.equal(
          await page.locator("main").getByRole("alert").count(),
          0,
          (
            await page.locator("main").getByRole("alert").allTextContents()
          ).join("; "),
        );
        assert.equal(
          await page
            .getByRole("button", { name: "已上传", exact: true })
            .count(),
          4,
        );
        const results = await page.evaluate(() => window.__imageLabUploads);
        assert.equal(results.length, 4);
        for (let i = 0; i < results.length; i++) {
          const response = await fetch(results[i].signedUrl, {
            signal: AbortSignal.timeout(45000),
          });
          assert.ok(response.ok, "signed object must be downloadable");
          const bytes = Buffer.from(await response.arrayBuffer());
          assert.equal(
            sha(bytes),
            sha(Buffer.from(local[i].data, "base64")),
            "cloud bytes must exactly match browser output",
          );
          assert.equal(results[i].bytes, local[i].bytes);
          record.variants[i].cloudPath = results[i].path;
          record.variants[i].sha256Verified = true;
          // Public path without a signature must NOT expose this private object.
          const publicUrl = new URL(results[i].signedUrl);
          publicUrl.pathname = publicUrl.pathname.replace(
            "/object/sign/",
            "/object/public/",
          );
          publicUrl.search = "";
          assert.equal(
            (await fetch(publicUrl, { signal: AbortSignal.timeout(15000) })).ok,
            false,
          );
        }
        await page.waitForFunction(
          () =>
            Array.from(document.querySelectorAll("[data-variant] img")).every(
              (img) =>
                img.complete &&
                img.naturalWidth > 0 &&
                img.src.includes("/storage/v1/object/sign/"),
            ),
          null,
          { timeout: 60000 },
        );
        const originalCard = page.locator('[data-variant="original"]');
        await originalCard
          .getByRole("button", { name: "切换本地预览" })
          .click();
        assert.match(
          await originalCard.locator("img").getAttribute("src"),
          /^blob:/,
        );
        const uploadTimes = await page
          .locator("[data-variant]")
          .evaluateAll((cards) =>
            cards.map((card) => card.querySelectorAll("dd")[3].textContent),
          );
        record.variants.forEach(
          (item, i) => (item.uploadTime = uploadTimes[i]),
        );
        await page.screenshot({
          path: path.join(artifacts, scenario.name + "-uploaded.png"),
          fullPage: true,
        });
      }
      report.cases.push(record);
      console.log(
        "PASS " +
          scenario.name +
          ": " +
          record.variants
            .map(
              (v) =>
                `${v.id} ${v.width}x${v.height} ${v.bytes} bytes (${v.reductionPercent}% smaller, ${v.encode})`,
            )
            .join("; "),
      );
    }
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `horizontal page overflow at ${width}`,
      );
    }
    await page.setViewportSize({ width: 375, height: 950 });
    await page.screenshot({
      path: path.join(artifacts, "mobile.png"),
      fullPage: true,
    });
    // Deterministic transparent test fixture made in the browser; not a benchmark photo.
    const transparent = await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#00a0aa";
      ctx.fillRect(150, 100, 340, 280);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await page.goto(base + "/image-upload-preview", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForFunction(
      () => !document.querySelector('input[type="file"]').disabled,
    );
    await fileInput.setInputFiles({
      name: "transparent.png",
      mimeType: "image/png",
      buffer: Buffer.from(transparent, "base64"),
    });
    await page.waitForFunction(
      () => document.querySelectorAll("[data-variant]").length === 4,
    );
    const pixel = () =>
      page.locator('[data-variant="high"] img').evaluate(async (img) => {
        await img.decode();
        const c = document.createElement("canvas");
        c.width = 1;
        c.height = 1;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        return Array.from(ctx.getImageData(0, 0, 1, 1).data);
      });
    assert.equal((await pixel())[3], 0);
    await page.getByLabel("压缩输出格式").selectOption("image/jpeg");
    await page.waitForFunction(
      () => document.querySelectorAll("[data-variant]").length === 4,
    );
    assert.deepEqual(await pixel(), [255, 255, 255, 255]);
    report.checks.push(
      "WebP preserves alpha; JPEG flattens transparency onto white; no upscaling; original SHA unchanged; compression does not auto-upload; responsive layouts.",
    );
    await fileInput.setInputFiles({
      name: "invalid.png",
      mimeType: "image/png",
      buffer: Buffer.from("not really an image"),
    });
    await page.locator("main").getByRole("alert").waitFor();
    assert.equal(await page.locator("[data-variant]").count(), 0);
    await fileInput.setInputFiles({
      name: "oversized.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.alloc(20 * 1024 * 1024 + 1),
    });
    await page.locator("main").getByRole("alert").waitFor();
    assert.match(
      await page.locator("main").getByRole("alert").innerText(),
      /20 MB/,
    );
    assert.equal(errors.length, 0, errors.join("\n"));
    const badOrigin = await page.request.post(
      base + "/image-upload-preview/upload",
      {
        headers: {
          origin: "https://example.test",
          "content-type": "image/jpeg",
        },
        data: Buffer.from([255, 216, 255]),
      },
    );
    assert.equal(badOrigin.status(), 403);
    report.checks.push(
      "Invalid and >20 MB inputs rejected; foreign origin rejected; no page JS errors.",
    );
    console.log(
      "PASS transparency, invalid/oversize input, origin guard, responsive layout, private bucket access checks.",
    );
    fs.writeFileSync(
      path.join(artifacts, "report.json"),
      JSON.stringify(report, null, 2),
    );
    console.log("Artifacts: " + artifacts);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
