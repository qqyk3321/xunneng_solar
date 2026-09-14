/* Local navigation test. Linked pages are not loaded; the click target is stubbed. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

async function main() {
  const origin = process.env.PREVIEW_TEST_ORIGIN || "http://192.168.1.176:3003";
  const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), "test-pages-"));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
  });
  const errors = [],
    workflowRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.origin === origin &&
      !url.pathname.startsWith("/_next/") &&
      !["/test-pages", "/favicon.ico"].includes(url.pathname)
    )
      workflowRequests.push(url.pathname);
  });
  try {
    const response = await page.goto(`${origin}/test-pages`, {
      waitUntil: "domcontentloaded",
    });
    assert.equal(response.status(), 200);
    await page
      .getByRole("heading", { name: "Test pages, all in one place." })
      .waitFor();
    const cards = page.locator("[data-test-route]");
    assert.equal(await cards.count(), 12);
    assert.match(
      await page.locator('meta[name="robots"]').getAttribute("content"),
      /noindex/,
    );
    const links = await page.locator("a").evaluateAll((elements) =>
      elements.map((el) => ({
        href: el.getAttribute("href"),
        target: el.target,
        rel: el.rel,
      })),
    );
    assert.ok(
      links.every(
        (link) =>
          link.href.startsWith("/") &&
          !link.href.includes("[id]") &&
          link.target === "_blank" &&
          link.rel.includes("noopener"),
      ),
    );
    const search = page.getByRole("searchbox", { name: "Search test pages" });
    // Wait for hydration before editing a server-rendered controlled input.
    await page.waitForFunction(() => {
      const input = document.querySelector('input[type="search"]');
      return (
        input &&
        Object.keys(input).some((key) => key.startsWith("__reactProps$"))
      );
    });
    await search.fill("富文本");
    await page
      .getByRole("status")
      .filter({ hasText: "Showing 2 of 12" })
      .waitFor();
    assert.equal(await cards.count(), 2);
    await search.fill("");
    await page
      .getByRole("button", {
        name: "Message review & legacy forms",
        exact: true,
      })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Showing 2 of 12" })
      .waitFor();
    assert.equal(await cards.count(), 2);
    await search.fill("not-a-test-page");
    await page
      .getByRole("heading", { name: "No matching test pages" })
      .waitFor();
    await page
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    assert.equal(await cards.count(), 12);
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `No overflow at ${width}`,
      );
      await page.screenshot({
        path: path.join(artifacts, `hub-${width}.png`),
        fullPage: true,
      });
    }
    assert.deepEqual(
      workflowRequests,
      [],
      "Directory and filters must not preload test pages or data",
    );
    await page
      .context()
      .route(`${origin}/contact-submissions-preview`, (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<h1>Navigation target reached</h1>",
        }),
      );
    const link = page
      .locator('[data-test-route="/contact-submissions-preview"]')
      .getByRole("link", { name: /^Open page:/ });
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      link.click(),
    ]);
    await popup
      .getByRole("heading", { name: "Navigation target reached" })
      .waitFor();
    assert.equal(popup.url(), `${origin}/contact-submissions-preview`);
    assert.equal(page.url(), `${origin}/test-pages`);
    await popup.close();
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify(
        {
          ok: true,
          registeredPages: 12,
          searchAndFilters: true,
          noPreloading: true,
          newTabNavigation: true,
          mobileLayout: true,
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
