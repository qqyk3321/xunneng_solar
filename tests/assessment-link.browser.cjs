const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const origin =
      process.env.PREVIEW_TEST_ORIGIN || "http://192.168.1.176:3003";
    for (const route of ["/", "/faq"]) {
      await page.goto(origin + route, { waitUntil: "load" });
      if (route === "/faq") {
        await page
          .getByRole("searchbox", { name: "Search the FAQ" })
          .fill("assessment");
        await page.locator('[data-faq-id="start-assessment"][open]').waitFor();
      }
      const links = page.getByRole("link", {
        name: "Get Your Free Assessment",
        exact: true,
      });
      assert.equal(await links.count(), route === "/" ? 5 : 3);
      for (const link of await links.all()) {
        assert.equal(await link.getAttribute("href"), "/consultation");
        const colors = await link.evaluate((el) => ({
          chrome: !!el.closest("header,footer"),
          bg: getComputedStyle(el).backgroundColor,
          fg: getComputedStyle(el).color,
        }));
        assert.equal(
          colors.bg,
          colors.chrome ? "rgb(0, 122, 135)" : "rgb(254, 166, 25)",
        );
        if (!colors.chrome) assert.equal(colors.fg, "rgb(66, 38, 0)");
      }
      for (const width of [320, 375, 768, 1280]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          route + " at " + width,
        );
      }
    }
    assert.deepEqual(errors, []);
    console.log(
      "Homepage and FAQ: content assessment links orange; header/footer teal; responsive checks passed.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
