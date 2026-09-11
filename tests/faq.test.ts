import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { FAQ_CATEGORIES, FAQ_ITEMS, searchFaq } from "../lib/faq/content";

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

test("FAQ reuses the guarded contact module and links to its own inquiry section", () => {
  const page = readFileSync("app/faq/page.tsx", "utf8");
  const directory = readFileSync("app/faq/faq-directory.tsx", "utf8");
  assert.match(page, /<HomepageContact variant="question"\s*\/>/);
  assert.ok(page.indexOf("<FaqDirectory") < page.indexOf("<HomepageContact"));
  assert.match(page, /<SiteHeader\s*\/>/);
  assert.match(directory, /<SectionAnchor href="#ask-question">/);
  const header = readFileSync("components/site-header.tsx", "utf8");
  assert.match(header, /homeSectionsLocal = false/);
  assert.match(header, /href={`\/#\${id}`}/);
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
  assert.deepEqual(searchFaq("10-year"), searchFaq("10 year"));
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
    /inverters and batteries come with a 10-year warranty/,
  );
  assert.match(warranty.answer, /solar panels come with a 25-year warranty/);
  assert.deepEqual(
    searchFaq("25-year").map((item) => item.id),
    ["warranty-terms"],
  );
  const services = FAQ_ITEMS.find(
    (item) => item.id === "cleaning-reinforcement",
  )!;
  assert.match(services.answer, /cleaning and reinforcement services/);
  assert.doesNotMatch(
    services.answer,
    /free|complimentary|included|warranty|charge|fee|cost|pric/i,
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
  assert.equal(searchFaq("warranty", "support").length, 1);
});
