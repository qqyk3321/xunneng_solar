// UI-only: block third-party Maps; never submit a real enquiry.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
(async () => {
  const browser = await chromium.launch();
  const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), "address-details-"));
  try {
    const page = await browser.newPage();
    await page.route(/https:\/\/.*(?:googleapis\.com|gstatic\.com|tally\.so)\/.*/, route => route.abort());
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto((process.env.PREVIEW_TEST_ORIGIN || "http://127.0.0.1:3003") + "/consultation", { waitUntil: "networkidle" });
      for (const [code, name, count] of [["AG", "Antigua", 6], ["DM", "Dominica", 10]]) {
        await page.getByLabel("Where is your property located?").selectOption(code);
        await page.getByRole("checkbox").check();
        await page.getByRole("button", { name: "Continue to assessment" }).click();
        const country = page.getByLabel("Country / territory", { exact: true });
        await country.waitFor();
        assert.equal(await country.inputValue(), name);
        assert.equal(await page.locator("gmpx-place-picker").count(), 0);
        assert.equal(await page.getByText("Your selection", { exact: true }).count(), 0);
        const parish = page.getByLabel("Parish / district", { exact: false });
        assert.equal(await parish.locator("option").count(), count + 1);
        assert.equal(await parish.inputValue(), "");
        assert.equal(await parish.evaluate(el => el.required), true);
        assert.equal(await parish.evaluate(el => el.checkValidity()), false);
        assert.equal(await page.getByRole("button", { name: "Find on map", exact: true }).isDisabled(), true);
        await parish.selectOption(code === "AG" ? "Saint Mary" : "Saint Andrew");
        assert.equal(await parish.evaluate(el => el.checkValidity()), true);
        await page.getByLabel("Town / village", { exact: false }).fill(code === "AG" ? "Bolans" : "Marigot");
        await page.getByLabel("House / building / unit", { exact: false }).fill("Blue House");
        assert.equal(await page.getByLabel("Postal code", { exact: false }).inputValue(), "");
        assert.equal(await page.getByRole("button", { name: "Use this location", exact: true }).isDisabled(), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: path.join(artifacts, `address-${code}-${width}.png`), fullPage: true });
        await page.getByRole("button", { name: "Change country or review privacy notice" }).click();
      }
    }
    console.log(JSON.stringify({ passed: true, artifacts }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
