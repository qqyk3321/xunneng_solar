const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const origin = process.env.PREVIEW_TEST_ORIGIN || "http://127.0.0.1:3003";
(async () => {
  const browser = await chromium.launch();
  try {
    for (const [region, width] of [["antigua", 1440], ["dominica", 375]]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await page.addInitScript(() => sessionStorage.setItem("sol-tide:cookie-ui:dismissed:v2", "1"));
      await page.route("**/*", route => ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort());
      await page.goto(origin + "/" + region + "/how-it-works#scene-solar-grid");
      await page.waitForFunction(() => !document.documentElement.dataset.siteLoading);
      const demo = page.locator("[data-scene]");
      await page.waitForFunction(() => document.querySelector("[data-scene]")?.dataset.scene === "solar-grid");
      assert.equal(await page.getByRole("group", { name: "Energy scenarios" }).getByRole("button").count(), 6);
      assert.equal(await page.locator("[data-hybrid-faq]").count(), 4);
      const question = page.locator('[data-hybrid-faq="hybrid-solar-battery"]');
      await question.locator("summary").click();
      {
        assert.equal(await question.locator("a").count(), 0);
        assert.equal(await page.getByRole("link", { name: /Back to home|Explore all FAQs/ }).count(), 0);
        await page.getByRole("button", { name: "Solar + battery", exact: true }).click();
        await page.getByRole("button", { name: "Details about this diagram", exact: true }).click();
        const note = page.getByRole("region", { name: "About this diagram", exact: true });
        await note.waitFor();
        assert.match(await note.innerText(), /settings and available energy/);
        await page.keyboard.press("Escape");
        await note.waitFor({ state: "hidden" });
        const launcher = page.getByRole("button", { name: "Chat on WhatsApp", exact: true });
        await launcher.click();
        const contact = page.getByRole("dialog", { name: "Let’s talk about your home." });
        await contact.waitFor();
        assert.match(await contact.getByRole("link", { name: "Chat on WhatsApp" }).getAttribute("href"), /^https:\/\/wa\.me\//);
        await page.keyboard.press("Escape");
        await contact.waitFor({ state: "hidden" });
        assert.ok(await launcher.evaluate(el => el === document.activeElement));
        await launcher.click();
        await contact.getByRole("button", { name: /Prefer email/ }).click();
        const message = page.locator('dialog[aria-labelledby="contact-dialog-title"]');
        await message.waitFor();
        await message.getByRole("button", { name: "Close message window" }).click();
        await message.waitFor({ state: "hidden" });
        assert.ok(await launcher.isVisible());
      }
      await page.waitForFunction(() => document.querySelector("[data-scene]")?.dataset.scene === "solar-battery");
      assert.equal(await demo.getAttribute("data-scene"), "solar-battery");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `/tmp/six-scenes-${width}.png`, fullPage: true });
      if (width > 1000) await page.locator("header").getByRole("link", { name: "FAQ", exact: true }).click();
      else await page.locator("footer").getByRole("link", { name: "FAQ", exact: true }).click();
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
