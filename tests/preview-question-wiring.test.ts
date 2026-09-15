import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("submission preview reuses the floating inquiry with the submission email", () => {
  const page = readFileSync("app/[region]/submission/[token]/page.tsx", "utf8");
  assert.match(page, /<HomeContact initialEmail=\{submission\.email\} variant="floating"/);
  assert.doesNotMatch(page, /variant="question"/);
  const contact = readFileSync("components/home-contact.tsx", "utf8");
  assert.match(contact, /useState\(initialEmail\)/);
  assert.match(contact, /value=\{email\}/);
});
