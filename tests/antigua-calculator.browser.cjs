/* Read-only local UI test. Uses an existing server; never starts one. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

async function main() {
  const origin = process.env.PREVIEW_TEST_ORIGIN || "http://192.168.1.176:3003";
  const artifacts = await fs.mkdtemp(
    path.join(os.tmpdir(), "antigua-calculator-"),
  );
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1100 },
    hasTouch: true,
  });
  page.setDefaultTimeout(15000);
  const errors = [],
    dataRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.pathname.startsWith("/api/") ||
      url.hostname.includes("supabase") ||
      ["POST", "PUT", "DELETE", "PATCH"].includes(request.method())
    )
      dataRequests.push(request.url());
  });
  async function expectText(id, text) {
    await page.getByTestId(id).filter({ hasText: text }).waitFor();
    assert.equal(await page.getByTestId(id).textContent(), text);
  }
  const slider = page.getByRole("slider");
  async function setSlider(value) {
    // Native range input events, used for precise package-boundary regression checks.
    await slider.evaluate((element, next) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      ).set.call(element, String(next));
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  }
  try {
    const response = await page.goto(origin + "/antigua-calculator-preview", {
      waitUntil: "load",
      timeout: 45000,
    });
    assert.equal(response.status(), 200);
    await page
      .getByRole("heading", { name: "Estimate Your Savings", exact: true })
      .waitFor();
    await expectText("selected-value", "EC$ 1,200");
    await expectText("monthly-saving", "EC$ 960");
    await expectText("annual-saving", "EC$ 11,520");
    await expectText("payback", "~3.5 years");
    await expectText("remaining-bill", "EC$ 240");
    await expectText("inverter", "6.0 kW");
    await expectText("battery", "10 kWh");
    assert.equal(await page.locator('input:not([type="range"])').count(), 0);
    assert.equal(await page.getByRole("textbox").count(), 0);
    assert.equal(await page.locator("details, main svg").count(), 0);
    assert.doesNotMatch(
      await page.locator("main").textContent(),
      /HYS-|Estimated |Price =|Calculation assumptions|annual savings ×/,
    );
    assert.equal(await page.getByTestId("derived-input").count(), 0);
    const resultSection = page.getByTestId("calculator-results");
    assert.equal(await resultSection.getByTestId("inverter").count(), 0);
    assert.equal(await resultSection.getByTestId("battery").count(), 0);
    assert.equal(
      await page
        .getByTestId("calculator-input")
        .getByTestId("system-preview")
        .count(),
      1,
    );
    const module = page.getByTestId("calculator-module");
    assert.equal(await module.count(), 1);
    assert.equal(await module.getByTestId("calculator-input").count(), 1);
    assert.equal(await module.getByTestId("calculator-results").count(), 1);
    assert.equal(
      await module.locator("header, main, h1").count(),
      0,
      "Reusable module has no standalone page chrome",
    );
    assert.equal(
      await page
        .getByTestId("calculator-input")
        .evaluate((el) => getComputedStyle(el).borderTopWidth),
      "0px",
    );
    assert.equal(
      await module.evaluate((el) => getComputedStyle(el).borderTopWidth),
      "1px",
    );
    assert.equal(
      await resultSection.evaluate((el) => getComputedStyle(el).borderTopWidth),
      "1px",
    );
    const contact = module.getByRole("link", {
      name: "Get Your Free Assessment",
    });
    assert.equal(await contact.getAttribute("href"), "/consultation");
    assert.deepEqual(await page.locator("dt").allTextContents(), [
      "Monthly savings",
      "Annual savings",
      "Simple payback",
      "Monthly bill after installation",
      "Suggested investment",
      "Outage backup At a 1 kW average load",
    ]);
    assert.match(
      await page.locator('meta[name="robots"]').getAttribute("content"),
      /noindex/,
    );

    const tariffHelp = page.getByRole("button", {
      name: "About the electricity tariff",
    });
    const tooltip = page.getByRole("tooltip");
    assert.equal(await tooltip.count(), 0);
    await tariffHelp.hover();
    await tooltip.waitFor();
    assert.ok((await tooltip.textContent()).includes("EC$ 0.80/kWh"));
    assert.ok((await tooltip.textContent()).includes("June 2026"));
    await tooltip.hover();
    assert.equal(await tooltip.isVisible(), true);
    await page.getByRole("heading", { name: "Your monthly bill" }).hover();
    await tooltip.waitFor({ state: "hidden" });
    await tariffHelp.focus();
    await tooltip.waitFor();
    await page.keyboard.press("Escape");
    await tooltip.waitFor({ state: "hidden" });

    await slider.focus();
    await page.keyboard.press("Home");
    await expectText("selected-value", "EC$ 360");
    await expectText("inverter", "3.8 kW");
    await expectText("battery", "5 kWh");
    await expectText("backup", "~4.1 hours");
    await expectText("payback", "~4.0 years");
    await page.keyboard.press("ArrowRight");
    await expectText("selected-value", "EC$ 361");
    await setSlider(714);
    await expectText("inverter", "3.8 kW");
    await expectText("price", "~EC$ 27,418");
    await setSlider(715);
    await expectText("inverter", "4.8 kW");
    await expectText("battery", "10 kWh");
    await slider.focus();
    await page.keyboard.press("End");
    await expectText("selected-value", "EC$ 2,366");
    await expectText("inverter", "11.5 kW");
    await expectText("payback", "~2.7 years");
    await expectText("price", "~EC$ 61,327");

    assert.equal(
      await page.getByRole("group", { name: "Input method" }).count(),
      0,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "I know my kWh", exact: true })
        .count(),
      0,
    );
    assert.equal(await slider.getAttribute("min"), "360");
    assert.equal(await slider.getAttribute("max"), "2366");
    assert.equal(
      await slider.getAttribute("aria-label"),
      "Adjust monthly bill",
    );

    // Pointer interaction really changes the range without any text field.
    const box = await slider.boundingBox();
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height / 2);
    const draggedValue = Number(await slider.inputValue());
    assert.ok(draggedValue > 1500 && draggedValue < 2000);
    await expectText(
      "selected-value",
      "EC$ " + new Intl.NumberFormat("en-US").format(draggedValue),
    );
    await setSlider(1200);
    await expectText("monthly-saving", "EC$ 960");
    for (const width of [320, 375, 768, 960, 1280]) {
      await page.setViewportSize({ width, height: 1100 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "No overflow at " + width,
      );
      for (const row of await page.locator("dl > div").all()) {
        const label = await row.locator("dt").boundingBox();
        const value = await row.locator("dd").boundingBox();
        assert.ok(
          label.x + label.width <= value.x,
          "No label/value overlap at " + width,
        );
      }
      await page.screenshot({
        path: path.join(artifacts, "calculator-" + width + ".png"),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 375, height: 900 });
    await tariffHelp.tap();
    await tooltip.waitFor();
    await page.getByRole("heading", { name: "Your monthly bill" }).tap();
    await tooltip.waitFor({ state: "hidden" });
    assert.deepEqual(errors, []);
    assert.deepEqual(dataRequests, []);
    // Verify the CTA without loading the actual consultation form or submitting data.
    await page.context().route(origin + "/consultation**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<h1>Consultation destination reached</h1>",
      }),
    );
    // Only in this browser test, use a new tab to validate the real link destination
    // against plain HTML without mocking Next's internal RSC navigation format.
    await contact.evaluate((link) => link.setAttribute("target", "_blank"));
    const [contactPage] = await Promise.all([
      page.waitForEvent("popup"),
      contact.click(),
    ]);
    await contactPage
      .getByRole("heading", { name: "Consultation destination reached" })
      .waitFor();
    assert.equal(contactPage.url(), origin + "/consultation");
    await contactPage.close();
    console.log(
      JSON.stringify(
        {
          ok: true,
          sliderOnly: true,
          reusableOuterCard: true,
          contactNavigation: true,
          billOnly: true,
          leftSystemPreview: true,
          paybackThirdAndOneDecimal: true,
          noCalculationExplanations: true,
          tooltipMouseKeyboardTouch: true,
          packageBoundaries: true,
          responsiveLayout: true,
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
