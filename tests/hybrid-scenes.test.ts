import test from "node:test";
import assert from "node:assert/strict";
import { HYBRID_SCENES, hybridSceneIndex } from "../lib/hybrid-scenes";
import { getFaqItems } from "../lib/faq/content";
test("hybrid scenarios distinguish charge, discharge, grid import and grid isolation", () => {
  const [day, night, outage, grid] = HYBRID_SCENES;
  assert.equal(day.batteryFlow, "charge");
  assert.equal(day.solarFlow, true);
  assert.equal(night.batteryFlow, "discharge");
  assert.equal(night.solarFlow, false);
  assert.equal(outage.gridFlow, false);
  assert.equal(outage.grid, "Disconnected");
  assert.equal(grid.gridFlow, true);
  assert.equal(grid.batteryFlow, "idle");
});
test("six manual scenes include distinct grid and battery top-up examples", () => {
  assert.equal(HYBRID_SCENES.length, 6);
  const [grid, battery] = HYBRID_SCENES.slice(4);
  assert.equal(grid.solarFlow, true);
  assert.equal(grid.gridFlow, true);
  assert.equal(grid.batteryFlow, "idle");
  assert.equal(battery.solarFlow, true);
  assert.equal(battery.gridFlow, false);
  assert.equal(battery.batteryFlow, "discharge");
  assert.equal(hybridSceneIndex("#bad-link"), -1);
  HYBRID_SCENES.forEach((scene, i) =>
    assert.equal(hybridSceneIndex(`#scene-${scene.id}`), i),
  );
});
test("both regional FAQs link to every scene in their own region", () => {
  for (const [country, slug] of [
    ["AG", "antigua"],
    ["DM", "dominica"],
  ] as const) {
    const items = getFaqItems(country).filter(
      (item) => item.category === "hybrid",
    );
    assert.equal(items.length, 6);
    for (const scene of HYBRID_SCENES)
      assert.ok(
        items.some(
          (item) =>
            item.link?.href === `/${slug}/how-it-works#scene-${scene.id}`,
        ),
      );
  }
});
