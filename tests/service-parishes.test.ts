import assert from "node:assert/strict";
import test from "node:test";
import { SERVICE_PARISHES, normalizeParish } from "../lib/service-parishes";
test("parishes follow the selected country", () => {
  assert.equal(SERVICE_PARISHES.AG.length, 6);
  assert.equal(SERVICE_PARISHES.DM.length, 10);
  assert.ok(SERVICE_PARISHES.AG.includes("Saint Mary"));
  assert.ok(!SERVICE_PARISHES.DM.includes("Saint Mary"));
});
test("Google variants normalize to known parish options only", () => {
  assert.equal(normalizeParish("St. John Parish", "AG"), "Saint John");
  assert.equal(normalizeParish("Saint Andrew", "DM"), "Saint Andrew");
  assert.equal(normalizeParish("Saint Andrew", "AG"), "");
  assert.equal(normalizeParish("Barbuda", "AG"), "");
});
