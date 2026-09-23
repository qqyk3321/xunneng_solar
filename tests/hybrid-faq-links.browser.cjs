const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const origin = process.env.PREVIEW_TEST_ORIGIN || "http://127.0.0.1:3003";
(async () => {
  const browser = await chromium.launch();
  try {
    for (const [region, width] of [["antigua", 1440], ["dominica", 375]]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.goto(origin + "/" + region + "/how-it-works#scene-solar-grid");
      const demo = page.locator("[data-scene]");
      await page.waitForFunction(() => document.querySelector("[data-scene]")?.dataset.scene === "solar-grid");
      assert.equal(await page.getByRole("group", { name: "Energy scenarios" }).getByRole("button").count(), 6);
      assert.equal(await page.locator("[data-hybrid-faq]").count(), 4);
      const question = page.locator('[data-hybrid-faq="hybrid-solar-battery"]');
      await question.locator("summary").click();
      await question.getByRole("link").click();
      await page.waitForFunction(() => document.querySelector("[data-scene]")?.dataset.scene === "solar-battery");
      assert.equal(await demo.getAttribute("data-scene"), "solar-battery");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `/tmp/six-scenes-${width}.png`, fullPage: true });
      await page.getByRole("link", { name: "Explore all FAQs" }).click();
      await page.waitForURL("**/" + region + "/faq");
      await page.getByRole("button", { name: "How the system works", exact: true }).click();
      assert.equal(await page.locator("[data-faq-id]").count(), 6);
      const entry = page.locator('[data-faq-id="hybrid-solar-grid"]');
      await entry.locator("summary").click();
      await entry.getByRole("link").click();
      await page.waitForFunction(() => document.querySelector("[data-scene]")?.dataset.scene === "solar-grid");
      assert.ok(page.url().includes("/" + region + "/how-it-works#scene-solar-grid"));
      await page.reload();
      await page.waitForFunction(() => document.querySelector("[data-scene]")?.dataset.scene === "solar-grid");
      console.log("PASS six scenes, shared compact FAQs, region-preserving links, hash reload:", region, width);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
