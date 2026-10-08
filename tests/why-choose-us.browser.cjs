const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

async function main() {
  const origin = process.env.PREVIEW_TEST_ORIGIN || "http://192.168.1.176:3003";
  const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), "why-choose-us-"));
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
    await page.waitForFunction(
      () =>
        document.querySelector('#contact-us button[type="submit"]')
          ?.disabled === false,
    );
    await page.evaluate(() => {
      window.__statSamples = {};
      new MutationObserver(() => {
        document.querySelectorAll("[data-stat]").forEach((card) => {
          const id = card.getAttribute("data-stat");
          const text = card.querySelector("[data-animated-value]")?.textContent;
          if (text == null) return;
          const samples = (window.__statSamples[id] ||= []);
          if (samples.at(-1) !== text) samples.push(text);
        });
      }).observe(document.querySelector("#benefits"), {
        childList: true,
        subtree: true,
        characterData: true,
      });
    });
    const section = page.locator("#benefits");
    assert.equal(await section.getByRole("listitem").count(), 3);
    assert.equal(await section.locator("[data-stat]").count(), 3);
    await section.locator("dl").scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        Object.values(window.__statSamples).length === 3 &&
        Object.values(window.__statSamples).every((values) =>
          values.some((text) => parseInt(text) === 0),
        ),
    );
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("[data-animated-value]")]
          .map((el) => el.textContent)
          .join(",") === "100+,95%,5",
    );
    const samples = await page.evaluate(() => window.__statSamples);
    for (const [id, target] of [
      ["installations", 100],
      ["savings", 95],
      ["payback", 5],
    ]) {
      assert.ok(
        samples[id].some(
          (text) => parseInt(text) > 0 && parseInt(text) < target,
        ),
        id + " counts through intermediate values",
      );
    }
    assert.equal(await section.locator('[data-stat="warranty"]').count(), 0);
    assert.match(await section.innerText(), /Illustrative count/);
    assert.match(await section.innerText(), /not guarantees/);
    await section.locator('[data-stat="installations"]').hover();
    await page.waitForFunction(() =>
      getComputedStyle(
        document.querySelector('[data-stat="installations"]'),
      ).transform.includes("-6"),
    );
    await page.mouse.move(0, 0);
    for (const width of [320, 375, 768, 1050, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      await section.scrollIntoViewIfNeeded();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "No overflow at " + width,
      );
      // Measure layout positions independently of the hover transform settling.
      const [first, second] = await section
        .locator("[data-stat]")
        .evaluateAll((elements) =>
          elements.map((el) => ({ x: el.offsetLeft, y: el.offsetTop })),
        );
      assert.equal(first.y, second.y, "Stats retain two columns at " + width);
      assert.ok(second.x > first.x);
      await section.screenshot({
        path: path.join(artifacts, width + ".png"),
        style: '[data-testid="home-header"] { visibility: hidden !important; }',
      });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await section
        .locator('[data-stat="installations"]')
        .evaluate((el) => getComputedStyle(el).transitionDuration),
      "0s",
    );
    await page.reload({ waitUntil: "load" });
    assert.deepEqual(
      await section.locator("[data-animated-value]").allTextContents(),
      ["100+", "95%", "5"],
    );
    const noJs = await browser.newPage({ javaScriptEnabled: false });
    await noJs.goto(origin, { waitUntil: "load" });
    assert.deepEqual(
      await noJs.locator("#benefits [data-animated-value]").allTextContents(),
      ["100+", "95%", "5"],
    );
    await noJs.close();
    assert.deepEqual(errors, []);
    assert.deepEqual(mutations, []);
    console.log(
      JSON.stringify(
        {
          ok: true,
          threeReasons: true,
          threeStats: true,
          counters: true,
          hover: true,
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
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
