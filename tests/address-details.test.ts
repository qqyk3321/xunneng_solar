import test from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_ADDRESS,
  parseAddressComponents,
  addressSummary,
} from "../lib/address-details";

test("Google address components map by type, not array position", () => {
  const parsed = parseAddressComponents([
    { types: ["route"], longText: "Market Street" },
    { types: ["country"], longText: "Antigua and Barbuda" },
    { types: ["locality"], longText: "St. John's" },
    { types: ["administrative_area_level_1"], longText: "Saint John" },
    { types: ["street_number"], longText: "12" },
  ]);
  assert.equal(parsed.town, "St. John's");
  assert.equal(parsed.district, "Saint John");
  assert.equal(parsed.street, "Market Street");
  assert.equal(parsed.building, "12");
  assert.equal(parsed.postalCode, "");
  assert.match(
    addressSummary(parsed, "Antigua"),
    /12, Market Street, St. John's, Saint John, Antigua/,
  );
});
test("reverse geocoding names and missing components are supported", () => {
  assert.equal(
    parseAddressComponents([{ types: ["postal_town"], long_name: "Roseau" }])
      .town,
    "Roseau",
  );
  assert.deepEqual(parseAddressComponents(), EMPTY_ADDRESS);
  assert.equal(
    addressSummary({ ...EMPTY_ADDRESS, town: " Roseau " }, "Dominica"),
    "Roseau, Dominica",
  );
});
