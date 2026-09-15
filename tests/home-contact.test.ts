import test from "node:test";
import assert from "node:assert/strict";
import { createContactHandler } from "../lib/anonymous-inquiry/contact-handler";
import type { InquiryPayload } from "../lib/anonymous-inquiry/handler";
import { textDocument } from "../lib/anonymous-inquiry/rich-text";

const origin = "http://192.168.1.176:3003";
test("public contact requires one valid country and includes it in the retry hash", async () => {
  const { saved, handle } = setup();
  for (const country of [null, "", "DO", "ag"]) {
    const data = form();
    if (country === null) data.delete("country_code"); else data.set("country_code", country);
    assert.equal((await handle(data)).status, 400);
  }
  const duplicate = form(); duplicate.append("country_code", "DM");
  assert.equal((await handle(duplicate)).status, 400);
  assert.equal(saved.length, 0);
  for (const country of ["AG", "DM"]) {
    const data = form(); data.set("country_code", country);
    assert.equal((await handle(data)).status, 201);
    assert.equal(saved.at(-1)!.countryCode, country);
  }
  assert.notEqual(saved[0].digest, saved[1].digest);
});
const id = "4583a8b3-a6a3-435d-b332-bfab81c1fb91";
function form(format = "plain") {
  const data = new FormData();
  data.set("email", " CONTACT@example.com ");
  data.set("requestId", id);
  data.set("website", "");
  data.set("format", format);
  data.set("country_code", "AG");
  data.set(
    "content",
    JSON.stringify(
      textDocument(
        "A plain message\nwith a second line <script>not executed</script>",
      ),
    ),
  );
  return data;
}
function setup(enabled = true, fail = false) {
  const saved: InquiryPayload[] = [];
  const handle = createContactHandler({
    enabled,
    origin,
    save: async (payload) => {
      saved.push(payload);
      if (fail) throw new Error("secret key should stay private");
      return {
        reference: payload.id,
        receivedAt: new Date().toISOString(),
        content: payload.content,
      };
    },
  });
  return {
    saved,
    handle: (data = form(), requestOrigin = origin) =>
      handle(
        new Request(`${origin}/home-preview/contact`, {
          method: "POST",
          body: data,
          headers: { origin: requestOrigin },
        }),
      ),
  };
}
test("contact plain format preserves literal text/newlines; rich format is distinct in its retry hash", async () => {
  const { saved, handle } = setup();
  assert.equal((await handle()).status, 201);
  assert.equal(saved[0].format, "plain");
  assert.equal(saved[0].email, "contact@example.com");
  assert.match(saved[0].message, /\nwith a second line <script>/);
  assert.equal((await handle(form("rich"))).status, 201);
  assert.equal(saved[1].format, "rich");
  assert.notEqual(saved[0].digest, saved[1].digest);
});
test("format is required, allowlisted, and cannot disguise rich content as plain text", async () => {
  for (const format of ["html", "", "plain"]) {
    const { saved, handle } = setup();
    const data = form(format);
    if (format === "plain")
      data.set(
        "content",
        JSON.stringify({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Bold message",
                  marks: [{ type: "bold" }],
                },
              ],
            },
          ],
        }),
      );
    const result = await handle(data);
    assert.equal(result.status, 400);
    assert.equal(saved.length, 0);
    assert.doesNotMatch(JSON.stringify(await result.json()), /[\u3400-\u9fff]/);
  }
  const data = form();
  data.delete("format");
  assert.equal((await setup().handle(data)).status, 400);
});
test("contact preserves origin/development guards and returns English failures without secrets", async () => {
  assert.equal((await setup(false).handle()).status, 404);
  assert.equal(
    (await setup().handle(form(), "https://invalid.example")).status,
    403,
  );
  const invalid = form();
  invalid.set("email", "bad");
  assert.equal((await setup().handle(invalid)).status, 400);
  const result = await setup(true, true).handle();
  assert.equal(result.status, 503);
  const body = await result.text();
  assert.doesNotMatch(body, /secret|[\u3400-\u9fff]/);
  assert.match(body, /draft/);
  assert.match(result.headers.get("cache-control")!, /no-store/);
});
