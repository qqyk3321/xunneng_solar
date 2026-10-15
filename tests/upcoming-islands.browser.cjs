const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.PREVIEW_TEST_ORIGIN || "http://127.0.0.1:3003";
const codes = [
  "KN",
  "LC",
  "VC",
  "GD",
  "BB",
  "SX",
  "JM",
  "BM",
  "MS",
  "TC",
  "VG",
  "SABA",
  "BONAIRE",
  "BS",
  "KY",
  "CW",
];
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [320, 375, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 950 } });
      await page.addInitScript(() =>
        sessionStorage.setItem("sol-tide:cookie-ui:dismissed:v2", "1"),
      );
      await page.goto(origin + "/antigua/how-it-works", {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(4000); // Let hydration and initial route effects settle before opening.
      await page
        .getByRole("button", {
          name: "Change installation location",
          exact: true,
        })
        .first()
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      const planned = dialog.getByRole("region", {
        name: "Coming soon — not yet available",
      });
      assert.equal(await planned.getByRole("listitem").count(), 16);
      assert.ok(
        !(await planned.textContent()).includes("more islands planned"),
      );
      assert.equal(
        await planned.locator("button, a, input, select").count(),
        0,
      );
      assert.equal(
        await dialog
          .getByRole("group", { name: "Installation location" })
          .getByRole("button")
          .count(),
        2,
      );
      await page.waitForFunction(() =>
        [...document.querySelectorAll("dialog[open] section img")].every(
          (img) => img.complete && img.naturalWidth > 0,
        ),
      );
      assert.equal(
        await planned.locator('li[aria-disabled="true"]').count(),
        16,
      );
      for (const item of await planned.getByRole("listitem").all()) {
        assert.ok(await item.isVisible());
      }
      const countries = dialog.getByRole("group", {
        name: "Installation location",
      });
      assert.equal(await countries.locator('[aria-pressed]').count(), 0);
      assert.equal(await dialog.getByRole("button", { name: /Save location|Continue/ }).count(), 0);
      assert.equal(
        await dialog.evaluate((el) => el.scrollWidth > el.clientWidth),
        false,
      );
      await dialog.screenshot({ path: `/tmp/upcoming-islands-${width}.png` });
      await dialog
        .getByRole("button", { name: "Close location selection" })
        .click();
      await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(4000);
      const select = page.locator("#wishlist-island");
      await select.waitFor({ state: "attached" });
      assert.deepEqual(
        await select
          .locator("option")
          .evaluateAll((options) => options.map((o) => o.value)),
        ["", ...codes, "OTHER"],
      );
      for (const code of codes) {
        await select.selectOption(code);
        assert.equal(await select.inputValue(), code);
      }
      // Mock only: no real customer data or external submission.
      await page.route("**/api/island-wishlist", async (route) => {
        assert.equal(route.request().postDataJSON().islandCode, "CW");
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });
      const form = page.getByRole("form", {
        name: "Bring solar to your island",
      });
      await form.locator("[name=email]").fill("test@example.com");
      await form.getByRole("button").click();
      await page
        .getByRole("heading", { name: "Your wish is on our list." })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      console.log(
        "PASS all sixteen flags, two service countries, all sixteen wishlist choices and mocked submit:",
        width,
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
