import test from "node:test";
import assert from "node:assert/strict";
import { isTallyFormEvent, isTallySubmissionMessage } from "../lib/tally-intake";

test("Tally ready events require the expected origin, event and form", () => {
  const data = JSON.stringify({ event: "Tally.FormLoaded", payload: { formId: "9q8RYQ" } });
  assert.equal(isTallyFormEvent("https://tally.so", data, "9q8RYQ", "Tally.FormLoaded"), true);
  assert.equal(isTallyFormEvent("https://wrong.example", data, "9q8RYQ", "Tally.FormLoaded"), false);
  assert.equal(isTallyFormEvent("https://tally.so", data, "other", "Tally.FormLoaded"), false);
  assert.equal(isTallySubmissionMessage("https://tally.so", data, "9q8RYQ"), false);
  assert.equal(isTallyFormEvent("https://tally.so", "bad JSON", "9q8RYQ", "Tally.FormLoaded"), false);
});
