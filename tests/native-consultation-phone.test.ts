import assert from "node:assert/strict";
import test from "node:test";
import { isValidPhoneNumber } from "libphonenumber-js/max";
import { phonePrefix, phoneLocalDigits, regionalPhoneValue, switchPhoneCountry } from "../lib/native-consultation/phone-input";

test("regional prefixes stay outside the local number and round-trip existing E.164 records", () => {
  assert.equal(phonePrefix("AG"), "+1 (268)");
  assert.equal(phonePrefix("DM"), "+1 (767)");
  assert.equal(phonePrefix("US"), "+1");
  assert.equal(phonePrefix("CN"), "+86");
  for (const [country, local, number] of [["AG", "4641234", "+12684641234"], ["DM", "2251234", "+17672251234"]] as const) {
    assert.equal(regionalPhoneValue(local, country), number);
    assert.equal(phoneLocalDigits(number, country), local);
    assert.ok(isValidPhoneNumber(number));
    assert.equal(regionalPhoneValue("", country), "");
  }
});

test("complete local, national and international pastes never duplicate the region prefix", () => {
  for (const input of ["4641234", "268 464 1234", "1 (268) 464-1234", "+1 (268) 464-1234", "0012684641234"]) {
    assert.equal(regionalPhoneValue(input, "AG"), "+12684641234", input);
  }
  for (const input of ["2251234", "767 225 1234", "1 (767) 225-1234", "+1 (767) 225-1234", "0017672251234"]) {
    assert.equal(regionalPhoneValue(input, "DM"), "+17672251234", input);
  }
  assert.equal(regionalPhoneValue("+1 (767) 225-1234", "AG"), "+17672251234");
});

test("local numbers starting with area digits and invalid lengths are not silently truncated", () => {
  assert.equal(regionalPhoneValue("2681234", "AG"), "+12682681234");
  assert.equal(regionalPhoneValue("7671234", "DM"), "+17677671234");
  for (const input of ["464", "26846412345", "126846412345"]) {
    assert.equal(isValidPhoneNumber(regionalPhoneValue(input, "AG")), false);
  }
});

test("changing the selected country replaces the prefix without retaining the previous area code", () => {
  assert.equal(switchPhoneCountry("+12684641234", "AG", "DM"), "+17674641234");
  assert.equal(switchPhoneCountry("+17672251234", "DM", "AG"), "+12682251234");
  assert.equal(switchPhoneCountry("+12684641234", "AG", "US"), "+14641234");
  assert.equal(switchPhoneCountry("", "AG", "DM"), "");
});
