// Read-only UI checks. No form submission, server startup or real Maps requests.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

(async () => {
  const origin = process.env.PREVIEW_TEST_ORIGIN || "http://192.168.1.176:3003";
  const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), "privacy-intake-"));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);
    const thirdParty = [];
    page.on("request", request => {
      if (/maps\.googleapis|maps\.gstatic|tally\.so/.test(request.url())) thirdParty.push(request.url());
    });
    await page.route(/https:\/\/.*(?:googleapis\.com|gstatic\.com|tally\.so)\/.*/, route => route.abort());
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      thirdParty.length = 0;
      await page.goto(origin + "/consultation", { waitUntil: "networkidle" });
      const country = page.getByLabel("Where is your property located?");
      const consent = page.getByRole("checkbox");
      const next = page.getByRole("button", { name: "Continue to assessment" });
      assert.equal(await next.isDisabled(), true);
      assert.equal(await consent.isChecked(), false);
      assert.equal(thirdParty.length, 0, "No Maps or Tally before acknowledgement");
      await country.selectOption("other");
      await page.getByRole("heading", { name: "More islands, in time." }).waitFor();
      assert.equal(await next.count(), 0);
      assert.equal(await page.locator("iframe").count(), 0);
      await country.selectOption("DM");
      await consent.check();
      assert.equal(await next.isEnabled(), true);
      const policy = page.getByRole("link", { name: /Privacy Policy/ });
      assert.equal(await policy.getAttribute("target"), "_blank");
      await page.screenshot({ path: path.join(artifacts, `intake-${width}.png`), fullPage: true });
      await next.click();
      await page.getByText("Property location: Dominica", { exact: true }).waitFor();
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(await country.inputValue(), "");
      assert.equal(await consent.isChecked(), false);
      await country.selectOption("AG");
      await consent.check();
      await next.click();
      await page.getByText("Property location: Antigua", { exact: true }).waitFor();
      await page.getByRole("button", { name: "Change country or review privacy notice" }).click();
      await country.selectOption("DM");
      assert.equal(await consent.isChecked(), false);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

      await page.goto(origin + "/privacy", { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: "Privacy policy", exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(artifacts, `privacy-${width}.png`), fullPage: true });

      await page.goto(origin + "/test-pages/cookie-preview", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      const dialog = page.getByRole("dialog");
      assert.equal(await dialog.isVisible(), true);
      const analytics = page.getByRole("switch", { name: "Analytics cookies" });
      assert.equal(await analytics.isChecked(), false);
      await analytics.check();
      await page.screenshot({ path: path.join(artifacts, `cookie-${width}.png`), fullPage: true });
      await page.keyboard.press("Escape");
      assert.equal(await dialog.isVisible(), false);
      await page.getByRole("button", { name: "Reject optional", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "No cookies, tracking or services were changed" }).waitFor();
      await page.getByRole("button", { name: "Cookie settings", exact: true }).click();
      assert.equal(await analytics.isChecked(), false);
      await page.getByRole("button", { name: "Save choices" }).click();
      await page.getByRole("button", { name: "Show banner again" }).click();
      await page.getByRole("button", { name: "Accept all" }).click();
      await page.getByRole("button", { name: "Cookie settings", exact: true }).click();
      assert.equal(await analytics.isChecked(), true);
      await page.keyboard.press("Escape");
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      assert.equal(await analytics.isChecked(), false);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    console.log(JSON.stringify({ passed: true, widths: [375, 1440], artifacts }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
