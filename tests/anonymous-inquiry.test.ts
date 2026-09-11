import test from "node:test";
import assert from "node:assert/strict";
import {
  createInquiryHandler,
  InquiryError,
  type InquiryPayload,
} from "../lib/anonymous-inquiry/handler";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_REQUEST_BYTES,
} from "../lib/anonymous-inquiry/config";
import { textDocument } from "../lib/anonymous-inquiry/rich-text";

const origin = "http://192.168.1.176:3003";
const id = "4583a8b3-a6a3-435d-b332-bfab81c1fb91";
function form() {
  const data = new FormData();
  data.set("requestId", id);
  data.set("email", " TEST@Example.com ");
  data.set(
    "content",
    JSON.stringify(textDocument("  请问这项服务如何使用？  ")),
  );
  data.set("website", "");
  return data;
}
function request(data = form(), headers: Record<string, string> = { origin }) {
  return new Request(`${origin}/contact-preview/submit`, {
    method: "POST",
    headers,
    body: data,
  });
}
function setup(options: { enabled?: boolean; fail?: boolean } = {}) {
  const saved: InquiryPayload[] = [];
  const handler = createInquiryHandler({
    enabled: options.enabled ?? true,
    origin,
    save: async (p) => {
      saved.push(p);
      if (options.fail)
        throw new Error("secret service-role credential must never escape");
      return { reference: p.id, receivedAt: "2026-09-09T00:00:00Z" };
    },
  });
  return { handler, saved };
}
test("anonymous text submission normalizes email, preserves text, and returns receipt only", async () => {
  const { handler, saved } = setup();
  const result = await handler(request());
  assert.equal(result.status, 201);
  assert.deepEqual(await result.json(), {
    reference: id,
    receivedAt: "2026-09-09T00:00:00Z",
  });
  assert.equal(saved[0].email, "test@example.com");
  assert.equal(saved[0].message, "请问这项服务如何使用？");
  assert.equal(saved[0].images.length, 0);
  assert.match(result.headers.get("cache-control")!, /no-store/);
});
test("production and foreign or missing Origin are denied before persistence", async () => {
  const disabled = setup({ enabled: false });
  assert.equal((await disabled.handler(request())).status, 404);
  assert.equal(disabled.saved.length, 0);
  const { handler, saved } = setup();
  assert.equal((await handler(request(form(), {}))).status, 403);
  assert.equal(
    (
      await handler(
        request(form(), {
          origin: "https://evil.example",
          "x-forwarded-host": "192.168.1.176:3003",
        }),
      )
    ).status,
    403,
  );
  assert.equal(saved.length, 0);
});
test("invalid emails, too short/long text, null bytes, IDs and honeypot never reach storage", async () => {
  for (const [key, value] of [
    ["email", "bad"],
    ["email", "a\nb@example.com"],
    ["message", "  "],
    ["message", "a".repeat(5001)],
    ["message", "hello\0there"],
    ["requestId", "bad"],
    ["website", "spam"],
  ]) {
    const { handler, saved } = setup();
    const data = form();
    data.set(
      key === "message" ? "content" : key,
      key === "message" ? JSON.stringify(textDocument(value)) : value,
    );
    assert.equal((await handler(request(data))).status, 400, key);
    assert.equal(saved.length, 0);
  }
});
test("unexpected, missing and repeated scalar fields are rejected", async () => {
  for (const modify of [
    (d: FormData) => d.append("email", "second@example.com"),
    (d: FormData) => d.delete("content"),
    (d: FormData) => d.set("bucket", "other"),
  ]) {
    const { handler, saved } = setup();
    const data = form();
    modify(data);
    assert.equal((await handler(request(data))).status, 400);
    assert.equal(saved.length, 0);
  }
});
test("images are limited by count, size, actual signature, and declared MIME", async () => {
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  for (const [files, expected] of [
    [[new Blob(["not an image"], { type: "image/png" })], 415],
    [[new Blob([png], { type: "image/jpeg" })], 415],
    [
      [
        new Blob([new Uint8Array(MAX_ATTACHMENT_BYTES + 1)], {
          type: "image/png",
        }),
      ],
      413,
    ],
    [
      Array.from({ length: 4 }, () => new Blob([png], { type: "image/png" })),
      400,
    ],
  ] as const) {
    const { handler, saved } = setup();
    const data = form();
    files.forEach((file) => data.append("images", file, "image.png"));
    assert.equal((await handler(request(data))).status, expected);
    assert.equal(saved.length, 0);
  }
});
test("deterministic payload hash includes attachment contents and ignores filename", async () => {
  const { handler, saved } = setup();
  for (const name of ["a.png", "b.png"]) {
    const data = form();
    const doc = textDocument("请问这项服务如何使用？");
    doc.content.push({ type: "inquiryImage", attrs: { id } });
    data.set("content", JSON.stringify(doc));
    data.append(
      "images",
      new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
        type: "image/png",
      }),
      name,
    );
    assert.equal((await handler(request(data))).status, 201);
  }
  await handler(request());
  assert.equal(saved[0].digest, saved[1].digest);
  assert.notEqual(saved[0].digest, saved[2].digest);
});
test("caps both declared and streamed total bytes", async () => {
  const { handler, saved } = setup();
  assert.equal(
    (
      await handler(
        request(form(), {
          origin,
          "content-length": String(MAX_REQUEST_BYTES + 1),
        }),
      )
    ).status,
    413,
  );
  const data = form();
  data.append("images", new Blob([new Uint8Array(MAX_REQUEST_BYTES)]), "large");
  assert.equal((await handler(request(data))).status, 413);
  assert.equal(saved.length, 0);
});
test("bad multipart and non-form submissions are rejected", async () => {
  const { handler } = setup();
  for (const [type, status] of [
    ["application/json", 415],
    ["multipart/form-data; boundary=nope", 400],
  ] as const)
    assert.equal(
      (
        await handler(
          new Request(`${origin}/contact-preview/submit`, {
            method: "POST",
            headers: { origin, "content-type": type },
            body: "bad",
          }),
        )
      ).status,
      status,
    );
});
test("failures expose no credentials and release active request slots", async () => {
  const { handler } = setup({ fail: true });
  for (let n = 0; n < 3; n++) {
    const r = await handler(request());
    assert.equal(r.status, 503);
    assert.doesNotMatch(await r.text(), /secret|credential|service-role/);
  }
});
test("repeat-in-flight and concurrent submissions are bounded", async () => {
  let release!: () => void;
  let entered!: () => void;
  const started = new Promise<void>((r) => {
    entered = r;
  });
  const block = new Promise<void>((r) => {
    release = r;
  });
  const handler = createInquiryHandler({
    enabled: true,
    origin,
    save: async (p) => {
      entered();
      await block;
      return { reference: p.id, receivedAt: "2026-09-09T00:00:00Z" };
    },
  });
  const first = handler(request());
  await started;
  assert.equal((await handler(request())).status, 429);
  release();
  assert.equal((await first).status, 201);
});
test("burst limit returns Retry-After", async () => {
  const { handler } = setup();
  for (let n = 0; n < 20; n++)
    assert.equal((await handler(request())).status, 201);
  const result = await handler(request());
  assert.equal(result.status, 429);
  assert.equal(result.headers.get("retry-after"), "60");
});
test("idempotency conflict remains a friendly 409", async () => {
  const handler = createInquiryHandler({
    enabled: true,
    origin,
    save: async () => {
      throw new InquiryError(
        409,
        "这次提交的内容已发生变化，请重新发送一条留言。",
      );
    },
  });
  assert.equal((await handler(request())).status, 409);
});
