import test from "node:test";
import assert from "node:assert/strict";
import { consultationWhatsAppUrl, DEFAULT_WHATSAPP_BASE_URL } from "../supabase/functions/_shared/whatsapp";

test("WhatsApp prefill preserves the submission reference and encodes message punctuation", () => {
  for (const base of [undefined, "https://wa.me/12680000001/"]) {
    const link = new URL(consultationWhatsAppUrl("ABC-123_dm", base));
    assert.equal(link.origin, "https://wa.me");
    assert.equal(link.pathname, base ? "/12680000001" : new URL(DEFAULT_WHATSAPP_BASE_URL).pathname);
    assert.equal(link.searchParams.get("text"), "Hi Sol & Tide, I'd like to discuss my preliminary quote.\nSubmission ID: ABC-123_dm");
    assert.equal([...link.searchParams].length, 1);
  }
});

test("only WhatsApp phone links and valid stored submission IDs are accepted", () => {
  for (const base of ["javascript:alert(1)", "https://wa.me.evil.test/1234567", "http://wa.me/1234567", "https://wa.me/1234567?text=wrong", "https://wa.me/+1234567", "https://wa.me/01234567"])
    assert.throws(() => consultationWhatsAppUrl("TEST-1", base));
  for (const id of ["", "x&text=wrong", "x\nwrong", "x".repeat(201)]) assert.throws(() => consultationWhatsAppUrl(id));
});
