/* Read-only visual and motion checks against the already-running local server. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

async function main() {
  const origin = process.env.PREVIEW_TEST_ORIGIN || "http://192.168.1.176:3003";
  const artifacts = await fs.mkdtemp(
    path.join(os.tmpdir(), "solar-installation-"),
  );
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1000 },
    });
    const errors = [],
      mutations = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(r.method()))
        mutations.push(r.url());
    });
    await page.goto(origin, { waitUntil: "load" });
    const section = page.locator("#solar-installation");
    const steps = section.locator("[data-installation-step]");
    assert.equal(await steps.count(), 4);
    assert.equal(await page.locator("#how-it-works").count(), 0);
    const reserved = page
      .getByRole("navigation", { name: "Main navigation" })
      .getByText("How it works", { exact: true });
    assert.equal(await reserved.count(), 0);
    assert.equal(
      await section
        .getByRole("link", { name: "Get Your Free Assessment" })
        .getAttribute("href"),
      "/consultation",
    );
    for (const phrase of [
      "Within 48 hours",
      "Around 2–4 days",
      "Typically 1–2 days",
      "Watch Your Bill Drop",
    ])
      await section.getByText(phrase, { exact: true }).waitFor();
    await section.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          '[data-installation-step][data-revealed="true"]',
        ).length === 4,
    );
    const animation = await steps
      .first()
      .locator("div")
      .evaluate((el) => getComputedStyle(el).animationName);
    assert.notEqual(animation, "none");
    await steps.first().hover();
    await page.waitForFunction(() =>
      getComputedStyle(
        document.querySelector("[data-installation-step] > span"),
      ).transform.startsWith("matrix(1.08"),
    );
    await page.mouse.move(0, 0);
    for (const width of [320, 375, 768, 960, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      await section.scrollIntoViewIfNeeded();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `No overflow at ${width}`,
      );
      const bounds = await steps.evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y };
        }),
      );
      if (width <= 900)
        assert.ok(bounds[1].y > bounds[0].y && bounds[1].x === bounds[0].x);
      else assert.ok(bounds.every((r) => r.y === bounds[0].y));
      await section.screenshot({ path: path.join(artifacts, `${width}.png`) });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await steps
        .first()
        .locator("div")
        .evaluate((el) => getComputedStyle(el).animationName),
      "none",
    );
    assert.equal(
      await steps
        .first()
        .locator("div")
        .evaluate((el) => getComputedStyle(el).transitionDuration),
      "0s",
    );
    const noJs = await browser.newPage({ javaScriptEnabled: false });
    await noJs.goto(origin, { waitUntil: "load" });
    const staticSteps = noJs.locator("[data-installation-step]");
    assert.equal(await staticSteps.count(), 4);
    assert.equal(
      await staticSteps
        .first()
        .locator("div")
        .evaluate((el) => getComputedStyle(el).opacity),
      "1",
    );
    await noJs.close();
    assert.deepEqual(errors, []);
    assert.deepEqual(mutations, []);
    console.log(
      JSON.stringify(
        {
          ok: true,
          steps: 4,
          systemGuideHidden: true,
          hoverMotion: true,
          entryMotion: true,
          reducedMotion: true,
          noJs: true,
          responsive: true,
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
