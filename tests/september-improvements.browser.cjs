// Read-only public UI regression checks; no enquiry or external form submissions.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const origin = process.env.PREVIEW_TEST_ORIGIN || "http://127.0.0.1:3003";
const key = "sol-tide:cookie-preferences:v1";
async function ready(page, path) {
  await page.goto(origin + path, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => !document.documentElement.dataset.siteLoading,
  );
}
(async () => {
  const browser = await chromium.launch();
  try {
    // A new tab/recreated browser context must restore preferences, not sessionStorage.
    for (const blocked of [false, true]) {
      const context = await browser.newContext();
      if (blocked)
        await context.addInitScript(() =>
          Object.defineProperty(window, "localStorage", {
            get() {
              throw new DOMException("Blocked", "SecurityError");
            },
          }),
        );
      const page = await context.newPage();
      await ready(page, "/");
      await page
        .getByRole("button", { name: "Cookie preferences", exact: true })
        .click();
      await page
        .locator("[data-cookie-notice]")
        .getByRole("button", { name: "Accept all", exact: true })
        .click();
      assert.ok(
        (await context.cookies()).some(
          (cookie) => cookie.name === "sol_tide_preferences",
        ),
      );
      if (!blocked)
        assert.equal(
          await page.evaluate(
            (key) => JSON.parse(localStorage.getItem(key)).analytics,
            key,
          ),
          true,
        );
      const state = await context.storageState();
      await context.close();
      const restored = await browser.newContext({ storageState: state });
      if (blocked)
        await restored.addInitScript(() =>
          Object.defineProperty(window, "localStorage", {
            get() {
              throw new DOMException("Blocked", "SecurityError");
            },
          }),
        );
      const returning = await restored.newPage();
      await ready(returning, "/antigua");
      await returning.evaluate(() => scrollTo(0, 500));
      await returning.waitForTimeout(5500);
      assert.equal(await returning.locator("[data-cookie-notice]").count(), 0);
      await returning.reload({ waitUntil: "domcontentloaded" });
      await returning.waitForFunction(
        () => !document.documentElement.dataset.siteLoading,
      );
      await returning
        .getByRole("button", { name: "Cookie preferences", exact: true })
        .click();
      await returning
        .locator("[data-cookie-notice]")
        .getByRole("button", { name: "Reject optional" })
        .click();
      assert.equal(
        JSON.parse(
          decodeURIComponent(
            (await restored.cookies()).find(
              (c) => c.name === "sol_tide_preferences",
            ).value,
          ),
        ).analytics,
        false,
      );
      await restored.close();
      console.log(
        "PASS persistent preferences, new session, footer editing; localStorage blocked:",
        blocked,
      );
    }
    for (const width of [375, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.addInitScript(() =>
        sessionStorage.setItem("sol-tide:cookie-ui:dismissed:v2", "1"),
      );
      for (const region of ["antigua", "dominica"]) {
        await ready(page, `/${region}`);
        const calc = page.getByTestId("calculator-module");
        await calc.scrollIntoViewIfNeeded();
        const selector = calc.getByRole("combobox", {
          name: "Calculator currency",
        });
        assert.equal(await selector.inputValue(), "USD");
        for (const [currency, prefix] of [
          ["XCD", "EC$"],
          ["EUR", "€"],
          ["XCG", "Cg"],
          ["USD", "US$"],
        ]) {
          const slider = calc.getByRole("slider");
          await slider.fill(await slider.getAttribute("max"));
          await selector.selectOption(currency);
          assert.ok(
            Number(await slider.inputValue()) <
              Number(await slider.getAttribute("max")),
            "currency resets slider",
          );
          assert.ok(
            (await calc.getByTestId("selected-value").textContent()).includes(
              prefix,
            ),
          );
          for (const field of [
            "price",
            "monthly-saving",
            "annual-saving",
            "remaining-bill",
          ])
            assert.ok(
              (await calc.getByTestId(field).textContent()).includes(prefix),
            );
        }
        await calc
          .getByRole("button", { name: "About exchange rates" })
          .click();
        const help = calc.getByRole("region", { name: "Fixed exchange rates" });
        await help.waitFor();
        assert.match(await help.textContent(), /22 September 2026/);
        assert.equal(await help.getByRole("link").count(), 3);
        await page.keyboard.press("Escape");
        assert.equal(await help.count(), 0);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
      }
      await ready(page, "/how-it-works");
      const demo = page.locator("[data-scene]");
      await demo.scrollIntoViewIfNeeded();
      for (const [label, scene] of [
        ["After sunset", "night"],
        ["Grid outage", "outage"],
        ["Grid support", "grid"],
        ["Sunny daytime", "day"],
      ]) {
        await page.getByRole("button", { name: new RegExp(label) }).click();
        assert.equal(await demo.getAttribute("data-scene"), scene);
        assert.equal(await demo.getAttribute("data-running"), "false");
      }
      await page.getByRole("button", { name: "Play demo" }).click();
      await page.waitForFunction(
        () =>
          document.querySelector("[data-scene]")?.dataset.running === "true",
      );
      await page.waitForFunction(
        () => document.querySelector("[data-scene]")?.dataset.scene === "night",
        {},
        { timeout: 12000 },
      );
      await page.getByRole("button", { name: "Pause demo" }).click();
      assert.equal(await demo.locator("animateMotion").count(), 0);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.getByRole("button", { name: /Sunny daytime/ }).click();
      await demo.screenshot({ path: `/tmp/hybrid-demo-${width}.png` });
      await page.screenshot({
        path: `/tmp/how-it-works-${width}.png`,
        fullPage: true,
      });
      console.log(
        "PASS currencies, currency reset, FX tooltip, hybrid controls & animation:",
        width,
      );
      await page.close();
    }
    const reduced = await browser.newPage({ reducedMotion: "reduce" });
    await ready(reduced, "/how-it-works");
    await reduced.locator("[data-scene]").scrollIntoViewIfNeeded();
    assert.equal(
      await reduced.locator("[data-scene]").getAttribute("data-running"),
      "false",
    );
    assert.equal(await reduced.locator("animateMotion").count(), 0);
    await reduced.close();
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const requested = new Set();
    page.on("request", (request) => {
      if (request.resourceType() === "image")
        requested.add(decodeURIComponent(request.url()));
    });
    await ready(page, "/");
    await page.waitForTimeout(800);
    assert.equal(
      [...requested].filter((url) => url.includes("/images/caribbean/")).length,
      0,
      "below-fold art must not download at entry",
    );
    await page.locator("#journey").scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        document.querySelector(
          '[data-viewport-image][data-image-ready="true"] img',
        )?.complete,
    );
    assert.ok([...requested].some((url) => url.includes("/images/caribbean/")));
    assert.ok(
      [...requested].filter((url) =>
        /\/(enquiry|review|survey|installation|handover)\.webp/.test(url),
      ).length < 5,
      "inactive story layers are deferred",
    );
    console.log("PASS viewport image deferral and reduced motion");
    await page.close();
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
