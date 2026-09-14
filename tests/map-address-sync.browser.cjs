// Synthetic Google SDK and reverse-geocoder results. No live geocoding or submissions.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.mapQueries = [];
      customElements.define("gmp-map", class extends HTMLElement {
        constructor() { super(); this.innerMap = {
          addListener: (_, handler) => { window.mockMapClick = handler; return { remove() {} }; },
          fitBounds: bounds => { window.mockBounds = bounds; },
        }; }
      });
      customElements.define("gmp-advanced-marker", class extends HTMLElement {});
      window.google = { maps: { importLibrary: async () => ({ Geocoder: class {
        async geocode(request) {
          window.mapQueries.push(request);
          if (request.address.includes("Missing")) return { results: [] };
          return { results: [{ place_id: "test-1", formatted_address: "Market Street, St. John's, Antigua", address_components: [{ types: ["locality"], long_name: "St. John's" }, { types: ["route"], long_name: "Market Street" }], geometry: {
            location: { lat: () => 17.12, lng: () => -61.84 },
            viewport: { toJSON: () => ({ north: 17.2, south: 17.1, east: -61.7, west: -61.9 }) },
          } }] };
        }
      } }) } };
    });
    await page.route(/https:\/\/.*(?:googleapis\.com|gstatic\.com|tally\.so)\/.*/, route => route.abort());
    await page.route("**/api/geocode", async route => {
      const body = route.request().postDataJSON();
      await page.evaluate(body => window.mapQueries.push({ address: body.address, componentRestrictions: { country: body.country } }), body);
      await route.fulfill({ json: { results: body.address.includes("Missing") ? [] : [{ id: "test-1", address: "Market Street, St. John's, Antigua", lat: 17.12, lng: -61.84, components: [{ types: ["locality"], long_name: "St. John's" }, { types: ["route"], long_name: "Market Street" }], viewport: { north: 17.2, south: 17.1, east: -61.7, west: -61.9 } }] } });
    });
    await page.route("**/api/reverse-geocode", route => route.fulfill({ json: { address: "Mapped street, Antigua", placeId: "pin-test", addressComponents: [{ types: ["locality"], long_name: "Google Town" }, { types: ["route"], long_name: "Mapped street" }] } }));
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto((process.env.PREVIEW_TEST_ORIGIN || "http://127.0.0.1:3003") + "/consultation", { waitUntil: "networkidle" });
      await page.getByLabel("Where is your property located?").selectOption("AG");
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Continue to assessment" }).click();
      await page.getByLabel("Parish / district", { exact: false }).selectOption("Saint John");
      await page.getByRole("status").filter({ hasText: "Showing the parish area" }).waitFor();
      assert.equal(await page.locator("gmp-advanced-marker").count(), 0, "Parish centre is not a selected property");
      assert.equal(await page.evaluate(() => window.mapQueries[0].componentRestrictions.country), "AG");
      const town = page.getByLabel("Town / village", { exact: false });
      await town.fill("Missing");
      await page.getByRole("button", { name: "Find on map", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "We couldn’t locate this address" }).waitFor();
      await town.fill("My town");
      await page.getByLabel("House / building / unit", { exact: false }).fill("Blue house");
      await page.getByRole("button", { name: "Find on map", exact: true }).click();
      const candidate = page.getByRole("list", { name: "Possible locations" }).getByRole("button");
      await candidate.waitFor();
      await candidate.click();
      assert.equal(await town.inputValue(), "My town");
      await page.waitForFunction(() => document.querySelector("gmp-map").center?.lat === 17.12);
      await page.waitForFunction(() => Boolean(window.mockMapClick));
      await page.evaluate(() => window.mockMapClick({ latLng: { lat: () => 17.13, lng: () => -61.85 } }));
      await page.getByRole("status").filter({ hasText: "Address details updated from the map." }).waitFor();
      assert.equal(await page.getByLabel("Street address", { exact: false }).inputValue(), "Mapped street", "Map click fills the address before any confirmation button is clicked");
      assert.equal(await town.inputValue(), "My town", "Autofill preserves manually entered text");
      await page.getByRole("button", { name: "Use this location", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "Location selected." }).waitFor();
      assert.equal(await town.inputValue(), "My town", "Manual text is preserved");
      assert.equal(await page.getByLabel("Street address", { exact: false }).inputValue(), "Mapped street");
      await page.getByRole("button", { name: "Review and continue" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Confirm and continue" }).click();
      const frame = page.getByTitle("Assessment details form");
      await frame.waitFor();
      const payload = JSON.parse(new URL(await frame.getAttribute("src")).searchParams.get("location_json"));
      assert.equal(payload.lat, 17.13);
      assert.equal(payload.addressDetails.building, "Blue house");
      assert.equal(payload.addressDetails.town, "My town");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    console.log("Map/address two-way interaction and final payload passed at 375px and 1440px (mocked Google).");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
