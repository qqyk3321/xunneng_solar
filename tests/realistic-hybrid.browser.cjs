// Read-only visual/media regression. No forms are submitted.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const origin = process.env.PREVIEW_TEST_ORIGIN || "http://127.0.0.1:3003";
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [375, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(origin + "/antigua/how-it-works");
      const demo = page.locator("[data-scene]");
      await demo.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () =>
          document.querySelector("[data-scene] img")?.complete &&
          document.querySelector("[data-scene] img")?.naturalWidth > 0,
      );
      await page.waitForFunction(
        () =>
          document.querySelector("[data-scene]")?.dataset.running === "true",
      );
      assert.equal(
        await page
          .getByRole("button", { name: /Play demo|Pause demo/ })
          .count(),
        0,
      );
      for (const [name, id] of [
        ["Sunny daytime", "day"],
        ["After sunset", "night"],
        ["Grid outage", "outage"],
        ["Grid support", "grid"],
      ]) {
        await page.getByRole("button", { name: new RegExp(name) }).click();
        assert.equal(await demo.getAttribute("data-scene"), id);
        assert.equal(
          await demo.getByRole("img").locator("span").count(),
          0,
          "no labels over the equipment image",
        );
        assert.ok(
          (await demo.locator("h2").textContent()).trim().length > 0,
          "mode explanation heading remains",
        );
        assert.equal(
          await demo.locator("dl > div").count(),
          4,
          "mode equipment statuses remain outside the image",
        );
        assert.equal(await demo.getAttribute("data-running"), "true");
        assert.ok((await demo.locator("animateMotion").count()) > 0);
        assert.equal(
          await demo.locator("svg textPath").count(),
          0,
          "no stationary direction arrows",
        );
        assert.ok(
          (await demo.locator("svg polygon").count()) > 0,
          "moving arrows replace particles",
        );
        const batteryMotion = demo
          .locator('animateMotion[path^="M498"]')
          .first();
        if (id !== "grid") {
          assert.equal(
            await batteryMotion.getAttribute("path"),
            id === "day" ? "M498 758V855" : "M498 855V758",
          );
          assert.equal(await batteryMotion.getAttribute("rotate"), "auto");
        }
        await demo.screenshot({
          path: `/tmp/realistic-hybrid-${width}-${id}.png`,
        });
      }
      await page.getByRole("button", { name: /Sunny daytime/ }).click();
      await page.waitForTimeout(10000);
      assert.equal(
        await demo.getAttribute("data-scene"),
        "day",
        "mode changes only on user selection",
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      await page.locator("footer").scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () =>
          document.querySelector("[data-scene]")?.dataset.running === "false",
      );
      await page.close();
      console.log(
        "PASS realistic scene, manual-only modes, animated flow, offscreen pause, no overflow:",
        width,
      );
    }
    for (const route of ["/", "/antigua", "/dominica"]) {
      const page = await browser.newPage();
      const images = [];
      page.on("request", (request) => {
        if (request.resourceType() === "image")
          images.push(decodeURIComponent(request.url()));
      });
      await page.goto(origin + route);
      await page.waitForTimeout(1200);
      await page.evaluate(() =>
        window.scrollTo(0, document.body.scrollHeight / 2),
      );
      await page.waitForTimeout(1000);
      assert.equal(
        images.some((url) =>
          /\/images\/[^?]+\.(png|jpe?g)(?:[?&]|$)/i.test(url),
        ),
        false,
      );
      assert.ok(images.some((url) => url.includes(".webp")));
      console.log("PASS public content image requests use WebP:", route);
      await page.close();
    }
    const reduced = await browser.newPage({ reducedMotion: "reduce" });
    await reduced.goto(origin + "/dominica/how-it-works");
    await reduced.locator("[data-scene]").scrollIntoViewIfNeeded();
    assert.equal(
      await reduced.locator("[data-scene]").getAttribute("data-running"),
      "false",
    );
    assert.equal(await reduced.locator("animateMotion").count(), 0);
    await reduced.close();
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
