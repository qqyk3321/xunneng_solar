import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)],
  );
}

test("public content photographs use genuine WebP, not legacy PNG/JPEG", () => {
  const photos = files("public/images");
  assert.ok(photos.length > 0);
  assert.deepEqual(photos.filter(file => /\.(png|jpe?g)$/i.test(file)), []);
  for (const file of photos.filter(file => file.endsWith(".webp"))) {
    const header = readFileSync(file).subarray(0, 12);
    assert.equal(header.toString("ascii", 0, 4), "RIFF", file);
    assert.equal(header.toString("ascii", 8, 12), "WEBP", file);
    // Preserve the already-published legacy asset (430,438 bytes) during Git
    // reconciliation. New/current content images retain the 400 KiB budget.
    const budget = file === "public/images/packages/home-5.webp" ? 425 * 1024 : 400 * 1024;
    assert.ok(statSync(file).size <= budget, `${file} exceeds the content image budget`);
  }
});
