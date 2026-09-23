import test from "node:test";
import assert from "node:assert/strict";
import { HYBRID_SCENES } from "../lib/hybrid-scenes";
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
