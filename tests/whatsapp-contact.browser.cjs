const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.PREVIEW_TEST_ORIGIN || "http://127.0.0.1:43187";
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [375, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.addInitScript(() =>
        localStorage.setItem("sol-tide:cookie-ui:dismissed:v2", "1"),
      );
      for (const path of ["/", "/antigua/faq", "/dominica/faq"]) {
        await page.goto(origin + path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2500);
        const footer = page.locator("footer");
        const footerText = await footer.innerText();
        assert.ok(footerText.includes("Solortide — solar"));
        assert.ok(!footerText.includes("Let’s explore solar"));
        assert.ok(!footerText.includes("Explore your local solution"));
        assert.equal(
          await footer
            .getByRole("link", { name: "Chat on WhatsApp" })
            .getAttribute("href"),
          "https://wa.me/8617605886812",
        );
        const scan = footer.getByRole("button", { name: "Scan QR code" });
        if (width > 900) {
          const separators = await footer
            .getByRole("navigation", { name: "Footer navigation" })
            .locator("..")
            .evaluate((el) =>
              ["::before", "::after"].map(
                (pseudo) => getComputedStyle(el, pseudo).width,
              ),
            );
          assert.deepEqual(separators, ["1px", "1px"]);
          assert.equal(await scan.isVisible(), false);
          const qr = footer.locator("figure img");
          await qr.scrollIntoViewIfNeeded();
          await qr.evaluate((img) => img.decode());
          assert.ok(await qr.isVisible());
          await page.evaluate(() => document.fonts.ready);
          await footer.screenshot({
            path:
              "/tmp/footer-inline-qr-" +
              (path === "/" ? "home" : path.split("/")[1]) +
              ".png",
            animations: "disabled",
          });
          continue;
        }
        await scan.click();
        const dialog = page.getByRole("dialog", {
          name: "Let’s talk about your home.",
        });
        await dialog.waitFor();
        assert.equal(
          await dialog
            .getByRole("link", { name: "Chat on WhatsApp" })
            .getAttribute("href"),
          "https://wa.me/8617605886812",
        );
        await dialog.locator("img").evaluate((img) => img.decode());
        assert.equal(
          await dialog.evaluate((el) => el.scrollWidth > el.clientWidth),
          false,
        );
        await dialog.screenshot({ path: "/tmp/whatsapp-" + width + ".png" });
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
        assert.ok(await scan.evaluate((el) => el === document.activeElement));
      }
      // Existing regional FAQ launcher now offers both channels.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      const launcher = page.getByRole("button", {
        name: "Chat on WhatsApp",
        exact: true,
      });
      if (await launcher.isVisible()) {
        await launcher.click();
        const dialog = page.getByRole("dialog", {
          name: "Let’s talk about your home.",
        });
        await dialog.waitFor();
        await dialog.getByRole("button", { name: /Prefer email/ }).click();
        await dialog.waitFor({ state: "hidden" });
        await page.waitForFunction(
          () => {
            const el = document.querySelector("#ask-question");
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            return rect.top < innerHeight && rect.bottom > 0;
          },
          null,
          { timeout: 10000 },
        );
      } else throw new Error("Expected FAQ floating contact launcher");
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.close();
      console.log(
        "PASS WhatsApp links, QR, close/focus, existing message flow:",
        width,
      );
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
