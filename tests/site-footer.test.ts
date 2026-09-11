import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SITE_CONTACT } from "../lib/site-contact";

test("homepage and FAQ share a footer and one source of contact details", () => {
  for (const path of ["components/demo-homepage.tsx", "app/faq/page.tsx"]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /<SiteFooter\s*\/>/);
    assert.doesNotMatch(source, /<footer/);
  }
  for (const path of [
    "components/site-footer.tsx",
    "components/support-email.tsx",
  ]) {
    assert.match(readFileSync(path, "utf8"), /SITE_CONTACT.email/);
  }
  assert.equal(SITE_CONTACT.email, "support@example.com");
  assert.equal(
    SITE_CONTACT.phoneHref,
    "tel:" + SITE_CONTACT.phone.replace(/[^+\d]/g, ""),
  );
  const footer = readFileSync("components/site-footer.tsx", "utf8");
  assert.match(footer, /href="\/consultation"/);
  assert.match(footer, /Get Your Free Assessment/);
  assert.match(footer, /href="\/#contact-us"/);
  assert.match(footer, /SITE_CONTACT.address/);
});
