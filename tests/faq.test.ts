import assert from "node:assert/strict";
import test from "node:test";

test("shared FAQ includes both regional equipment certification lists", () => {
  const antigua = FAQ_ITEMS.find(item => item.id === "antigua-equipment-certifications")!;
  const dominica = FAQ_ITEMS.find(item => item.id === "dominica-equipment-certifications")!;
  for (const standard of ["IEEE 1547-2018", "IEEE 1547.1-2020", "SRD2.0", "UL 1741", "CSA C22.2 No.107.1", "UL 1741 CRD", "UL 1741 SB", "FCC Part 15 Class B", "UL 1699B", "UL 1998", "UN 38.3", "CEC", "UL 1973", "UL 9540A", "UL 9540"]) assert.ok(antigua.answer.includes(standard), standard);
  for (const standard of ["EN 50549", "NRS 097-2-1", "IEC 62109-1/-2", "IEC/EN 61000-6-1/-2/-3/-4", "IEC 62619", "UN 38.3", "CE-EMC"]) assert.ok(dominica.answer.includes(standard), standard);
  for (const item of [antigua, dominica]) {
    assert.equal(item.category, "support");
    assert.match(item.answer, /selected model/);
  }
});
import { readFileSync } from "node:fs";
import { FAQ_CATEGORIES, FAQ_ITEMS, getFaqItems, searchFaq } from "../lib/faq/content";
import { ANTIGUA_CONFIG, DOMINICA_CONFIG } from "../lib/antigua-calculator/config";

test("regional FAQ localizes the tariff and all action destinations without mutating shared copy", () => {
  const before = JSON.stringify(FAQ_ITEMS);
  for (const [country, slug, utility, config] of [
    ["AG", "antigua", "APUA", ANTIGUA_CONFIG],
    ["DM", "dominica", "DOMLEC", DOMINICA_CONFIG],
  ] as const) {
    const items = getFaqItems(country);
    assert.equal(items.length, FAQ_ITEMS.length);
    assert.equal(new Set(items.map(item => item.id)).size, items.length);
    const tariff = items.find(item => item.id === "calculator-tariff")!;
    assert.ok(tariff.question.includes(utility));
    assert.ok(tariff.answer.includes(config.tariff.sourceDate));
    assert.ok(tariff.answer.includes(config.tariff.fuelAdjustment.toFixed(2)));
    assert.equal(items.find(item => item.id === "calculator-location")!.link!.href, `/${slug}#calculator`);
    for (const item of items) {
      if (item.link) assert.ok([`/${slug}#calculator`, `/${slug}/consultation`, "#ask-question"].includes(item.link.href));
    }
    assert.deepEqual(searchFaq("", "all", items), items);
    assert.ok(searchFaq(utility, "savings", items).some(item => item.id === "calculator-tariff"));
    assert.deepEqual(searchFaq(country === "AG" ? "DOMLEC" : "APUA", "savings", items), []);
    assert.equal(items.find(item => item.id === "warranty-terms")!.answer, FAQ_ITEMS.find(item => item.id === "warranty-terms")!.answer);
  }
  const dominica = getFaqItems("DM").find(item => item.id === "calculator-tariff")!;
  assert.match(dominica.answer, /not a verified current tariff/);
  assert.match(dominica.answer, /October 1, 2026 is not included/);
  assert.match(dominica.answer, /15%.*100 kWh/);
  assert.equal(JSON.stringify(FAQ_ITEMS), before);
});

test("budget FAQ explains the direction of the calculation instead of promising a quotation", () => {
  for (const country of ["AG", "DM"] as const) {
    const answer = getFaqItems(country).find(item => item.id === "investment-quote")!.answer;
    assert.match(answer, /assumed annual bill savings multiplied by an assumed payback period/);
    assert.match(answer, /not a supplier quotation/);
  }
  const page = readFileSync("components/regional-faq-page.tsx", "utf8");
  assert.match(page, /await requireRegion\(params\)/);
  assert.match(page, /items={getFaqItems\(country\)}/);
});

test("generator integration and expansion are searchable, qualified support topics", () => {
  const generator = searchFaq("existing generator", "support").find(
    (item) => item.id === "existing-generator",
  );
  const expansion = searchFaq("扩容", "support").find(
    (item) => item.id === "future-expansion",
  );
  assert.ok(generator && expansion);
  assert.match(generator.answer, /^In many cases, yes\./);
  assert.match(generator.answer, /site assessment/);
  assert.match(
    expansion.answer,
    /equipment compatibility and electrical capacity/,
  );
});

test("household appliance guidance is searchable and accounts for system sizing", () => {
  for (const query of ["fridge", "air conditioning", "washing machine", "water heater", "24/7", "负载"]) {
    assert.ok(searchFaq(query, "support").some((item) => item.id === "household-appliances"));
  }
  const item = FAQ_ITEMS.find((item) => item.id === "household-appliances")!;
  assert.match(item.answer, /suitably sized/);
  assert.match(item.answer, /daytime use/);
  assert.match(item.answer, /appliances you use together/);
});

test("software monitoring is searchable and explains free access and connectivity", () => {
  for (const query of ["subscription", "monitoring", "收费"]) {
    assert.ok(
      searchFaq(query, "support").some((item) => item.id === "software-monitoring"),
    );
  }
  const item = FAQ_ITEMS.find((item) => item.id === "software-monitoring")!;
  assert.match(item.answer, /no additional charge/);
  assert.match(item.answer, /WiFi network with internet access/);
  assert.match(item.answer, /keep the equipment connected/);
});

test("FAQ reuses the guarded contact module and links to its own inquiry section", () => {
  const page = readFileSync("components/regional-faq-page.tsx", "utf8");
  const directory = readFileSync("app/faq/faq-directory.tsx", "utf8");
  const deferredContact = readFileSync(
    "components/deferred-homepage-contact.tsx",
    "utf8",
  );
  assert.match(page, /<DeferredHomepageContact variant="question"\s*\/>/);
  assert.ok(
    page.indexOf("<FaqDirectory") < page.indexOf("<DeferredHomepageContact"),
  );
  assert.match(deferredContact, /import\("\.\/homepage-contact"\)/);
  assert.match(deferredContact, /id={question \? "ask-question"/);
  assert.match(page, /<SiteHeader\s*\/>/);
  assert.match(directory, /<SectionAnchor href="#ask-question">/);
  const header = readFileSync("components/site-header.tsx", "utf8");
  assert.match(header, /homeSectionsLocal = false/);
  assert.ok(header.includes('href={`${regionPath(country)}#${id}`}'));
});

test("FAQ entries have unique IDs, real topics and safe local destinations", () => {
  assert.equal(
    new Set(FAQ_ITEMS.map((item) => item.id)).size,
    FAQ_ITEMS.length,
  );
  for (const item of FAQ_ITEMS) {
    assert.ok(FAQ_CATEGORIES.some((category) => category.id === item.category));
    assert.ok(item.question.trim() && item.answer.trim());
    if (item.link)
      assert.ok(
        ["/consultation", "/#calculator", "/#contact-us"].includes(
          item.link.href,
        ),
      );
  }
});

test("search covers questions, answers and keywords with case and punctuation normalization", () => {
  assert.deepEqual(searchFaq(""), FAQ_ITEMS);
  assert.deepEqual(searchFaq("  "), FAQ_ITEMS);
  assert.deepEqual(searchFaq("WARRANTY"), searchFaq("warranty"));
  assert.deepEqual(searchFaq("8-year"), searchFaq("8 year"));
  assert.deepEqual(
    searchFaq(" FUEL  surcharge 0.80 ").map((item) => item.id),
    ["calculator-tariff"],
  );
  assert.deepEqual(
    searchFaq("保修").map((item) => item.id),
    ["warranty-terms"],
  );
  assert.deepEqual(searchFaq("wárranty"), searchFaq("warranty"));
  assert.ok(
    searchFaq("no solar contribution").some(
      (item) => item.id === "backup-duration",
    ),
  );
  assert.deepEqual(searchFaq("<script>alert(1)</script>"), []);
  assert.deepEqual(searchFaq("no-such-faq-entry"), []);
});

test("warranty durations and separate services match the supplied business scope", () => {
  const warranty = FAQ_ITEMS.find((item) => item.id === "warranty-terms")!;
  assert.match(
    warranty.answer,
    /inverters come with an 8-year warranty/,
  );
  assert.match(warranty.answer, /solar panels come with a 15-year warranty/);
  assert.match(warranty.answer, /battery specification is 4,000 cycles/);
  assert.doesNotMatch(warranty.answer, /10.year|25.year/);
  assert.match(warranty.answer, /faults in the equipment itself that arise during normal use/);
  assert.match(warranty.answer, /our team will help investigate/);
  assert.deepEqual(
    searchFaq("15-year").map((item) => item.id),
    ["warranty-terms"],
  );
  const services = FAQ_ITEMS.find(
    (item) => item.id === "cleaning-reinforcement",
  )!;
  assert.match(services.answer, /cleaning and reinforcement services/);
  assert.match(services.answer, /arranged separately from equipment warranty coverage/);
  assert.doesNotMatch(
    services.answer,
    /free|complimentary|included/i,
  );
  for (const query of ["cleaning", "reinforcement", "清洗", "加固"]) {
    assert.deepEqual(
      searchFaq(query).map((item) => item.id),
      [services.id],
    );
  }
});

test("topic selection combines with search, not replaces it", () => {
  for (const category of FAQ_CATEGORIES) {
    assert.deepEqual(
      searchFaq("", category.id),
      FAQ_ITEMS.filter((item) => item.category === category.id),
    );
  }
  assert.equal(searchFaq("warranty", "getting-started").length, 0);
  assert.equal(searchFaq("warranty", "support").length, 2);
});
