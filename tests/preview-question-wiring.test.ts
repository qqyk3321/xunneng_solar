import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("submission preview reuses the floating inquiry with the submission email", () => {
  const page = readFileSync("app/[region]/submission/[token]/page.tsx", "utf8");
  assert.match(
    page,
    /<DeferredFloatingContact initialEmail=\{submission\.email\}/,
  );
  assert.doesNotMatch(page, /variant="question"/);
  const deferred = readFileSync(
    "components/deferred-floating-contact.tsx",
    "utf8",
  );
  assert.match(deferred, /initialEmail=\{initialEmail\}/);
  assert.match(deferred, /variant="floating"/);
  const contact = readFileSync("components/home-contact.tsx", "utf8");
  assert.match(contact, /useState\(initialEmail\)/);
  assert.match(contact, /value=\{email\}/);
});
