/* Local search and layout checks. No backend reads/writes or server startup. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

async function main() {
  const origin = process.env.PREVIEW_TEST_ORIGIN || "http://192.168.1.176:3003";
  const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), "faq-"));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
  });
  page.setDefaultTimeout(15000);
  const errors = [],
    workflowRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.pathname.startsWith("/api/") ||
      url.hostname.includes("supabase") ||
      ["POST", "PUT", "DELETE", "PATCH"].includes(request.method())
    )
      workflowRequests.push(request.url());
  });
  async function checkFooter() {
    const footer = page.getByRole("contentinfo");
    assert.equal(await footer.count(), 1);
    for (const [label, href] of [
      ["support@solortide.com", "mailto:support@solortide.com"],
      ["+1 (268) 555-0100", "tel:+12685550100"],
      ["Get Your Free Assessment", "/consultation"],
      ["Contact us", "/#contact-us"],
    ]) {
      assert.equal(
        await footer
          .getByRole("link", { name: label, exact: true })
          .getAttribute("href"),
        href,
      );
    }
    assert.match(
      await footer.innerText(),
      /123 Example Street, St. John's, Antigua/,
    );
  }
  async function checkBrand() {
    for (const region of [
      page.getByTestId("home-header"),
      page.getByRole("contentinfo"),
    ]) {
      const logo = region.locator('img[src="/icon.svg"]');
      assert.equal(await logo.count(), 1);
      await logo.evaluate((img) => img.decode());
      assert.equal(await logo.getAttribute("alt"), "");
    }
    const icon = page.locator('link[rel="icon"][type="image/svg+xml"]');
    assert.equal(await icon.count(), 1);
    const response = await page.request.get(
      new URL(await icon.getAttribute("href"), origin).href,
    );
    assert.equal(response.status(), 200);
    assert.match(response.headers()["content-type"], /image\/svg\+xml/);
  }
  try {
    const response = await page.goto(origin + "/faq", {
      waitUntil: "load",
      timeout: 45000,
    });
    assert.equal(response.status(), 200);
    await page
      .getByRole("heading", { name: "Frequently asked questions." })
      .waitFor();
    assert.match(await page.title(), /FAQ/);
    await checkFooter();
    await checkBrand();
    assert.equal(await page.locator("#contact-us").count(), 0);
    assert.equal(await page.locator("#ask-question").count(), 1);
    await page
      .getByRole("form", { name: "Ask a question", exact: true })
      .waitFor();
    for (const [label, href] of [
      ["Savings", "/#calculator"],
      ["Why solar", "/#benefits"],
      ["Contact us", "/#contact-us"],
    ]) {
      assert.equal(
        await page
          .getByRole("navigation", { name: "Main navigation" })
          .getByRole("link", { name: label, exact: true })
          .getAttribute("href"),
        href,
      );
    }
    assert.equal(
      await page
        .getByRole("navigation", { name: "Main navigation" })
        .getByText("How it works", { exact: true })
        .count(),
      0,
    );
    assert.deepEqual(await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link").allTextContents(), ["Savings", "Why solar", "Contact us", "FAQ"]);
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Contact us", exact: true })
      .click();
    await page.waitForURL(origin + "/#contact-us");
    assert.equal(new URL(page.url()).pathname, "/");
    assert.equal(new URL(page.url()).hash, "#contact-us");
    await page.goto(origin + "/faq", { waitUntil: "load" });
    const search = page.getByRole("searchbox", { name: "Search the FAQ" });
    const entries = page.locator("[data-faq-id]");
    assert.equal(await entries.count(), 26);
    assert.equal(await page.locator("details[open]").count(), 0);
    const first = entries.first();
    await first.locator("summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await first.getAttribute("open"), "");
    await page.keyboard.press("Enter");
    assert.equal(await first.getAttribute("open"), null);

    await search.fill("fuel surcharge 0.80");
    await page
      .getByRole("status")
      .filter({ hasText: "1 answer matching your search" })
      .waitFor();
    assert.equal(await entries.count(), 1);
    assert.equal(
      await entries.first().getAttribute("data-faq-id"),
      "calculator-tariff",
    );
    assert.equal(await page.locator("details[open]").count(), 1);
    await page.getByText(/It uses the June 2026 preset/).waitFor();
    await search.fill("CLEANING");
    await page.locator('[data-faq-id="cleaning-reinforcement"]').waitFor();
    assert.equal(await entries.count(), 1);
    await page
      .getByText(/solar panel cleaning and reinforcement services/)
      .waitFor();
    await page.getByRole("link", { name: /Ask a question/ }).first().click();
    assert.equal(new URL(page.url()).pathname, "/faq");
    assert.equal(
      await page
        .locator("#ask-question")
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await page.getByText(/agree the service scope with you/).waitFor();
    await page
      .getByRole("button", { name: "Getting started", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "No matching questions." })
      .waitFor();
    await page.getByRole("button", { name: "Reset search & topics" }).click();
    assert.equal(await search.inputValue(), "");
    assert.equal(await entries.count(), 26);
    assert.equal(
      await search.evaluate((el) => el === document.activeElement),
      true,
    );
    await page
      .getByRole("button", { name: "Equipment & support", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "10 answers to explore" })
      .waitFor();
    await search.fill("清洗");
    await page
      .getByRole("status")
      .filter({ hasText: "1 answer matching your search" })
      .waitFor();
    await page
      .getByRole("button", { name: "Clear search", exact: true })
      .click();
    assert.equal(
      await entries.count(),
      10,
      "Clear search preserves the chosen topic",
    );
    await search.fill("加固");
    await page
      .locator('[data-faq-id="cleaning-reinforcement"][open]')
      .waitFor();
    assert.equal(await entries.count(), 1);
    await page
      .getByText(
        /We provide solar panel cleaning and reinforcement services/,
      )
      .waitFor();
    await page
      .getByRole("button", { name: "All questions", exact: true })
      .click();
    await search.fill("no-such-faq-entry");
    await page
      .getByRole("heading", { name: "No matching questions." })
      .waitFor();
    await page.getByRole("button", { name: "Reset search & topics" }).click();
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "No overflow at " + width,
      );
      await page.screenshot({
        path: path.join(artifacts, "faq-" + width + ".png"),
        fullPage: true,
      });
    }
    await search.fill("battery");
    assert.ok((await page.locator("details[open]").count()) > 0);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(workflowRequests, []);
    assert.deepEqual(errors, []);

    await page.goto(origin, { waitUntil: "load", timeout: 45000 });
    await checkFooter();
    await checkBrand();
    for (const width of [320, 375, 1050, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      const visibleLinks = page
        .getByTestId("home-header")
        .locator('a[href="/faq"]:visible');
      assert.equal(
        await visibleLinks.count(),
        1,
        "One accessible header FAQ link at " + width,
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
    assert.equal(await page.locator('footer a[href="/faq"]').count(), 1);
    await page
      .getByTestId("home-header")
      .locator('a[href="/faq"]:visible')
      .click();
    await page
      .getByRole("heading", { name: "Frequently asked questions." })
      .waitFor();
    assert.equal(new URL(page.url()).pathname, "/faq");
    assert.deepEqual(workflowRequests, []);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify(
        {
          ok: true,
          answers: 19,
          localSearch: true,
          topics: true,
          keyboardAccordion: true,
          emptyAndReset: true,
          mobileLayout: true,
          homepageLinks: true,
          noBackendRequests: true,
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
