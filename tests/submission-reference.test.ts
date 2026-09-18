import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { tallySubmissionId } from "../lib/tally-intake";

test("submission ID comes from the authenticated Tally event metadata, not answers", () => {
  const event = (id: unknown, formId = "9q8RYQ") =>
    JSON.stringify({
      event: "Tally.FormSubmitted",
      payload: { id, formId, fields: [{ id: "fake" }] },
    });
  assert.equal(
    tallySubmissionId("https://tally.so", event("AbC-123"), "9q8RYQ"),
    "AbC-123",
  );
  for (const id of [null, undefined, 123, "", "<script>", "a".repeat(201)])
    assert.equal(
      tallySubmissionId("https://tally.so", event(id), "9q8RYQ"),
      null,
    );
  assert.equal(
    tallySubmissionId("https://evil.example", event("123"), "9q8RYQ"),
    null,
  );
  assert.equal(
    tallySubmissionId("https://tally.so", event("123", "other"), "9q8RYQ"),
    null,
  );
  assert.equal(
    tallySubmissionId("https://tally.so", "broken json", "9q8RYQ"),
    null,
  );
});

test("mail and token-protected preview use the stored submission ID", () => {
  const edge = readFileSync(
    "supabase/functions/tally-webhook/index.ts",
    "utf8",
  );
  assert.match(edge, /SUBMISSION_ID: args.row.submission_id/);
  assert.match(
    readFileSync("lib/consultation-preview.ts", "utf8"),
    /tally_form_submissions\(submission_id,/,
  );
  assert.match(
    readFileSync("app/[region]/submission/[token]/page.tsx", "utf8"),
    /<dd>\{submission.submission_id\}<\/dd>/,
  );
  assert.match(edge, /new Date\(args.row.submitted_at\)/);
  assert.match(edge, /return regionalTime\(date, countryCode\).display/);
  assert.doesNotMatch(readFileSync("app/[region]/submission/[token]/page.tsx", "utf8"), /SubmissionReference/);
});
