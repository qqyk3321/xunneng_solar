/* Local read-only layout/navigation test. Never submits an inquiry or starts a server. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

async function main() {
  const origin = process.env.PREVIEW_TEST_ORIGIN || "http://192.168.1.176:3003";
  const artifacts = await fs.mkdtemp(
    path.join(os.tmpdir(), "homepage-redesign-"),
  );
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
  });
  page.setDefaultTimeout(15000);
  const errors = [],
    mutations = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method()))
      mutations.push(request.url());
  });
  await page.addInitScript(() => {
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options) {
      window.__homeScrollBehavior = options?.behavior;
      return original.call(this, options);
    };
  });
  async function anchorVisible(id) {
    await page.waitForFunction((target) => {
      const section = document.getElementById(target).getBoundingClientRect();
      const header = document
        .querySelector('[data-testid="home-header"]')
        .getBoundingClientRect();
      return section.top >= header.bottom && section.top < header.bottom + 36;
    }, id);
  }
  try {
    const response = await page.goto(origin, {
      waitUntil: "load",
      timeout: 45000,
    });
    assert.equal(response.status(), 200);
    // Wait for hydration before testing enhanced (rather than native fallback) anchors.
    await page.waitForFunction(
      () =>
        document.querySelector('#contact-us button[type="submit"]')
          ?.disabled === false,
    );
    const hero = page.getByTestId("home-hero");
    await hero.getByRole("heading", { level: 1 }).waitFor();
    assert.match(await page.title(), /Antigua Solar & Storage/);
    assert.match(
      await hero.getByRole("heading", { level: 1 }).innerText(),
      /for Antigua/,
    );
    assert.doesNotMatch(
      await page.locator("body").innerText(),
      /caribbean|加勒比/i,
    );
    for (const label of [
      "UL Certified Equipment",
      "Local Parts Stock",
    ]) {
      await hero.getByText(label, { exact: true }).waitFor();
    }
    assert.equal(
      await hero
        .getByRole("link", { name: "Get Your Free Assessment" })
        .getAttribute("href"),
      "/consultation",
    );
    const estimate = hero.getByRole("link", {
      name: "Get an Estimate",
      exact: true,
    });
    assert.equal(await estimate.getAttribute("href"), "#calculator");
    assert.equal(await page.getByTestId("calculator-module").count(), 1);
    assert.equal(await page.locator("#contact-us").count(), 1);
    assert.equal(
      await page.getByRole("button", { name: /Sign in|Account menu/ }).count(),
      0,
    );
    const text = await page.locator("main").textContent();
    assert.doesNotMatch(
      text,
      /Service Areas Across the Caribbean|Zero Friction Deployment|99\.9%|No outages|Cat-5 Rated/,
    );
    assert.doesNotMatch(
      text,
      /START WITH YOUR ELECTRICITY BILL|WHY CHOOSE US|YOUR INSTALLATION JOURNEY|A CONVERSATION STARTS HERE/,
    );
    assert.match(text, /APUA October 2026/);
    const sections = await page
      .locator("main > section[id]")
      .evaluateAll((nodes) => nodes.map((node) => node.id));
    assert.deepEqual(sections, [
      "calculator",
      "benefits",
      "solar-installation",
      "contact-us",
    ]);
    await estimate.click();
    await anchorVisible("calculator");
    assert.equal(new URL(page.url()).hash, "#calculator");
    assert.equal(
      await page.evaluate(() => window.__homeScrollBehavior),
      "smooth",
    );
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "calculator",
    );
    const module = page.getByTestId("calculator-module");
    assert.equal(
      await module.evaluate((el) => getComputedStyle(el).borderTopWidth),
      "1px",
    );
    await page
      .getByTestId("monthly-saving")
      .filter({ hasText: "EC$ 960" })
      .waitFor();
    const slider = module.getByRole("slider");
    await slider.focus();
    await slider.press("Home");
    await page
      .getByTestId("monthly-saving")
      .filter({ hasText: "EC$ 288" })
      .waitFor();
    await slider.press("End");
    await page
      .getByTestId("price")
      .filter({ hasText: "~EC$ 61,327" })
      .waitFor();
    const contact = module.getByRole("link", {
      name: "Get Your Free Assessment",
    });
    assert.equal(await contact.getAttribute("href"), "/consultation");
    assert.equal(
      await contact.evaluate((el) => getComputedStyle(el).backgroundColor),
      "rgb(254, 166, 25)",
    );
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Contact us", exact: true })
      .click();
    await anchorVisible("contact-us");
    assert.equal(new URL(page.url()).hash, "#contact-us");
    const form = page.getByRole("form", { name: "Contact us", exact: true });
    await form.getByRole("button", { name: "Add photos", exact: true }).click();
    await page
      .getByRole("dialog", { name: "A little more detail.", exact: true })
      .waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    for (const width of [320, 375, 768, 960, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "No overflow at " + width,
      );
      for (const row of await module.locator("dl > div").all()) {
        const dt = await row.locator("dt").boundingBox();
        const dd = await row.locator("dd").boundingBox();
        assert.ok(
          dt.x + dt.width <= dd.x,
          "Calculator values do not overlap at " + width,
        );
      }
      await page.screenshot({
        path: path.join(artifacts, "home-" + width + ".png"),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 375, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await estimate.click();
    await anchorVisible("calculator");
    assert.equal(
      await page.evaluate(() => window.__homeScrollBehavior),
      "auto",
    );
    assert.deepEqual(mutations, []);
    assert.deepEqual(errors, []);
    // The optional account route still reuses this body without adding login to `/`.
    const previewResponse = await page.goto(origin + "/home-preview", {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    assert.equal(previewResponse.status(), 200);
    await page.getByRole("link", { name: "Sign in", exact: true }).waitFor();
    assert.equal(await page.getByTestId("calculator-module").count(), 1);
    assert.equal(await page.locator("#contact-us").count(), 1);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(mutations, []);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify(
        {
          ok: true,
          rootHomepage: true,
          sectionsAndClaims: true,
          calculatorLinked: true,
          contactLinked: true,
          reducedMotion: true,
          responsiveLayout: true,
          noSubmissions: true,
          accountPreviewPreserved: true,
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
