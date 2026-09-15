import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SITE_CONTACT, supportEmail } from "../lib/site-contact";

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
    assert.match(readFileSync(path, "utf8"), /RegionalSupportLink/);
  }
  assert.equal(supportEmail("AG"), "ag-support@solortide.com");
  assert.equal(supportEmail("DM"), "dm-support@solortide.com");
  assert.equal(supportEmail(null), null);
  assert.equal(SITE_CONTACT.showMockContacts, false);
  assert.equal(
    SITE_CONTACT.phoneHref,
    "tel:" + SITE_CONTACT.phone.replace(/[^+\d]/g, ""),
  );
  const footer = readFileSync("components/site-footer.tsx", "utf8");
  assert.ok(footer.includes('href={regionPath(country, "/consultation")}'));
  assert.match(footer, /Get Your Free Assessment/);
  assert.ok(footer.includes('href={`${regionPath(country)}#contact-us`}'));
  assert.match(footer, /SITE_CONTACT.address/);
  assert.doesNotMatch(footer, /packageJson|Version /);
  assert.match(footer, /Ready for your/);
  assert.match(footer, /next step/);
  assert.match(footer, /className=\{styles.settings\}/);
  assert.match(footer, /variant="text"/);
  assert.ok(footer.indexOf('variant="text"') < footer.indexOf('className={styles.middle}'));
  assert.ok(footer.indexOf('className={styles.middle}') < footer.indexOf('className={styles.invitation}'));
});
