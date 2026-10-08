/* Read-only browser checks: no form submission, telemetry or external writes. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const origin = process.env.PREVIEW_TEST_ORIGIN || "http://127.0.0.1:3107";

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      await context.addInitScript(() => sessionStorage.setItem("sol-tide:cookie-ui:dismissed:v2", "1"));
      await context.route("**/*", route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== new URL(origin).origin || /(?:\/_vercel\/|\/[a-f0-9]{16}\/)/.test(url.pathname) || !["GET", "HEAD"].includes(request.method()))
          return route.fulfill({ status: 204 });
        return route.continue();
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      for (const [slug, utility, price] of [["antigua", "APUA", "40,386"], ["dominica", "DOMLEC", "39,715"]]) {
        await page.goto(`${origin}/${slug}/faq`);
        await page.getByRole("searchbox").fill(utility);
        const tariff = page.locator('[data-faq-id="calculator-tariff"]');
        await tariff.waitFor();
        assert.match(await tariff.innerText(), new RegExp(utility));
        await page.getByRole("searchbox").fill("calculator");
        const link = page.getByRole("link", { name: /Explore the calculator/ });
        assert.equal(await link.getAttribute("href"), `/${slug}#calculator`);
        await link.click();
        await page.waitForURL(`${origin}/${slug}#calculator`);
        const calculator = page.getByTestId("calculator-module");
        await calculator.waitFor();
        assert.equal(await page.locator("#calculator").count(), 1);
        await calculator.getByTestId("scenario-notice").scrollIntoViewIfNeeded();
        assert.equal(await calculator.getByTestId("scenario-notice").isVisible(), true);
        assert.match(await calculator.getByTestId("scenario-notice").innerText(), /80% bill reduction · Not a quotation/);
        assert.match(await calculator.getByTestId("tariff-reference").innerText(), new RegExp(utility));
        assert.equal(await calculator.getByRole("region", { name: "Tariff sources and assumptions" }).count(), 0);
        assert.match(await calculator.getByTestId("budget-explanation").innerText(), /not equipment and installation costs/);
        assert.equal(await calculator.getByTestId("monthly-saving").innerText(), "EC$ 960");
        assert.equal(await calculator.getByTestId("annual-saving").innerText(), "EC$ 11,520");
        assert.ok((await calculator.getByTestId("price").innerText()).includes(price));
        await calculator.getByRole("slider").fill("1000");
        await page.waitForFunction(() => document.querySelector('[data-testid="monthly-saving"]')?.textContent === "EC$ 800");
        assert.equal(await calculator.getByTestId("annual-saving").innerText(), "EC$ 9,600");
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (process.env.CAPTURE_REVIEW) await calculator.screenshot({ path: `/tmp/regional-calculator-${slug}-${width}.png` });

        await page.goto(`${origin}/${slug}/faq`);
        await page.getByRole("searchbox").fill("quote");
        const consult = page.locator('[data-faq-id="investment-quote"] a');
        assert.equal(await consult.getAttribute("href"), `/${slug}/consultation`);
        await page.getByRole("searchbox").fill("cleaning");
        await page.getByRole("link", { name: /Ask a question/ }).first().click();
        assert.equal(await page.locator("#ask-question").count(), 1);

        await page.goto(`${origin}/${slug}/privacy`);
        const contact = page.getByRole("link", { name: "Contact us form", exact: true });
        assert.equal(await contact.getAttribute("href"), `/${slug}#contact-us`);
        await contact.click();
        await page.waitForURL(`${origin}/${slug}#contact-us`);
        await page.locator("#contact-us").waitFor();
      }
      await page.goto(`${origin}/antigua/faq`);
      await page.getByRole("searchbox").fill("APUA");
      await page.getByRole("button", { name: "Change installation location" }).last().click();
      const chooser = page.getByRole("dialog", { name: "Where would you like to install your system?" });
      await chooser.getByRole("button", { name: /^Dominica/ }).click();
      await chooser.getByRole("button", { name: "Save location", exact: true }).click();
      await page.waitForURL(`${origin}/dominica/faq`);
      assert.equal(await page.getByRole("searchbox").inputValue(), "");
      await page.getByRole("searchbox").fill("DOMLEC");
      await page.locator('[data-faq-id="calculator-tariff"]').waitFor();
      await page.goto(`${origin}/privacy`);
      await page.getByRole("link", { name: "Choose your location to contact us", exact: true }).click();
      await page.waitForURL(`${origin}/#countries`);
      await page.locator("#countries").waitFor();
      assert.deepEqual(errors, []);
      await context.close();
    }
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const page = await noJs.newPage();
    for (const [slug, utility, wrong] of [["antigua", "APUA", "DOMLEC"], ["dominica", "DOMLEC", "APUA"]]) {
      await page.goto(`${origin}/${slug}/faq`);
      const tariff = page.locator('[data-faq-id="calculator-tariff"]');
      assert.match(await tariff.textContent(), new RegExp(utility));
      assert.ok(!(await tariff.textContent()).includes(wrong));
    }
    await noJs.close();
    console.log("PASS: regional FAQ/search/links, calculator disclosures and unchanged values, privacy links, mobile layout and no-JS country content.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
