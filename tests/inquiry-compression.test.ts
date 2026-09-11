import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPRESSION_STEPS,
  encodeWithinBudget,
} from "../lib/anonymous-inquiry/compression-policy";
import {
  MAX_ATTACHMENT_BYTES,
  TARGET_IMAGE_BYTES,
} from "../lib/anonymous-inquiry/config";

function blob(size: number, type = "image/webp") {
  return new Blob([new Uint8Array(size)], { type });
}
test("stops at target without needlessly reducing readability", async () => {
  let calls = 0;
  const result = await encodeWithinBudget(async (step) => {
    calls++;
    assert.equal(step.maxEdge, 1920);
    return blob(TARGET_IMAGE_BYTES);
  });
  assert.equal(calls, 1);
  assert.equal(result.size, TARGET_IMAGE_BYTES);
});
test("adapts quality and resolution in bounded steps", async () => {
  const calls: unknown[] = [];
  await encodeWithinBudget(async (step) => {
    calls.push(step);
    return blob(calls.length < 3 ? 200 * 1024 : 70 * 1024);
  });
  assert.deepEqual(calls, COMPRESSION_STEPS.slice(0, 3));
});
test("keeps smallest candidate when encoded sizes are not monotonic", async () => {
  const sizes = [300, 200, 110, 120, 130];
  let calls = 0;
  const result = await encodeWithinBudget(async () =>
    blob(sizes[calls++] * 1024),
  );
  assert.equal(result.size, 110 * 1024);
  assert.equal(calls, 5);
});
test("rejects over-budget output, empty files and PNG fallback", async () => {
  for (const output of [
    blob(MAX_ATTACHMENT_BYTES + 1),
    blob(0),
    blob(100, "image/png"),
  ]) {
    await assert.rejects(encodeWithinBudget(async () => output));
  }
});
test("accepts small JPEG fallback", async () => {
  assert.equal(
    (await encodeWithinBudget(async () => blob(10_000, "image/jpeg"))).type,
    "image/jpeg",
  );
});
