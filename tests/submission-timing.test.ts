import test from "node:test";
import assert from "node:assert/strict";
import { submissionTiming } from "../lib/submission-timing";
test("response target is 48 elapsed hours after actual submission, using AST", () => {
  const result = submissionTiming("2026-09-30T02:30:00Z")!;
  assert.equal(result.submitted.date, "29 Sep 2026");
  assert.equal(result.submitted.time, "10:30 PM");
  assert.equal(result.response.iso, "2026-10-02T02:30:00.000Z");
  assert.equal(result.response.date, "1 Oct 2026");
  assert.equal(submissionTiming("invalid"), null);
});

test("both countries use local AST with readable dates, minutes and no seconds", () => {
  for (const country of ["AG", "DM"] as const) {
    for (const instant of ["2026-09-18T06:41:01Z", "2026-01-18T06:41:01Z"]) {
      const result = submissionTiming(instant, country)!;
      assert.equal(result.submitted.time, "2:41 AM");
      assert.match(result.submitted.display, /18 (Sep|Jan) 2026 · 2:41 AM AST/);
    }
  }
});
