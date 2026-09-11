import test from "node:test";
import assert from "node:assert/strict";
import {
  textDocument,
  validateRichDocument,
  type RichNode,
} from "../lib/anonymous-inquiry/rich-text";
import { createInquiryHandler } from "../lib/anonymous-inquiry/handler";

const id = "4583a8b3-a6a3-435d-b332-bfab81c1fb91";
const origin = "http://192.168.1.176:3003";
const paragraph = (text: string): RichNode => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});
test("photo widths round-trip safely and old images keep their canonical representation", () => {
  const check = (attrs: Record<string, unknown>) =>
    validateRichDocument({
      type: "doc",
      content: [
        paragraph("A photo description"),
        { type: "inquiryImage", attrs },
      ],
    }).document.content[1].attrs;
  for (const width of [40, 280, 460, 1600]) {
    assert.deepEqual(check({ id, width }), { id, width });
  }
  assert.deepEqual(check({ id }), { id });
  assert.deepEqual(check({ id, width: null }), { id });
  for (const width of [0, 39, 1601, 280.5, "280", "100%", "url(evil)"]) {
    assert.throws(() => check({ id, width }));
  }
  assert.throws(() => check({ id, width: 280, height: 200 }));
  assert.throws(() => check({ id, style: "width:280px" }));
});
test("official template headings and alignment round-trip with strict attribute validation", () => {
  const document = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2, textAlign: "center" },
        content: [{ type: "text", text: "测试居中标题" }],
      },
      {
        type: "paragraph",
        attrs: { textAlign: null },
        content: [{ type: "text", text: "说明文字" }],
      },
    ],
  };
  const result = validateRichDocument(document);
  assert.equal(result.text, "测试居中标题\n说明文字");
  assert.deepEqual(result.document.content[0].attrs, {
    level: 2,
    textAlign: "center",
  });
  assert.equal(result.document.content[1].attrs, undefined);
  assert.deepEqual(
    validateRichDocument(JSON.parse(JSON.stringify(result.document))),
    result,
  );
  for (const attrs of [
    { level: 4 },
    { level: "2" },
    { level: 2, textAlign: "url(evil)" },
    { level: 2, style: "color:red" },
  ]) {
    assert.throws(() =>
      validateRichDocument({
        type: "doc",
        content: [{ ...document.content[0], attrs }],
      }),
    );
  }
});
test("canonical rich document retains marks, lists, quotes and text-image-text ordering", () => {
  const doc = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "说明加粗斜体",
            marks: [{ type: "italic" }, { type: "bold" }],
          },
        ],
      },
      { type: "inquiryImage", attrs: { id } },
      {
        type: "orderedList",
        attrs: { start: 2, type: null },
        content: [{ type: "listItem", content: [paragraph("图片后的说明")] }],
      },
      { type: "blockquote", content: [paragraph("引用说明")] },
    ],
  };
  const result = validateRichDocument(doc);
  assert.deepEqual(result.imageIds, [id]);
  assert.match(result.text, /说明加粗斜体\n\n图片后的说明\n引用说明/);
  assert.deepEqual(
    validateRichDocument(JSON.parse(JSON.stringify(result.document))),
    result,
  );
  assert.equal(result.document.content[2].attrs?.start, 2);
});
test("rejects HTML, executable marks, arbitrary attributes, URLs and foreign image references", () => {
  for (const extra of [
    { type: "script", text: "alert(1)" },
    { type: "paragraph", attrs: { onclick: "alert(1)" } },
    { type: "inquiryImage", attrs: { id, src: "javascript:alert(1)" } },
    { type: "inquiryImage", attrs: { id: "../other-user/image.png" } },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "click",
          marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
        },
      ],
    },
  ])
    assert.throws(() =>
      validateRichDocument({
        type: "doc",
        content: [paragraph("正常问题描述"), extra],
      }),
    );
  assert.throws(() => validateRichDocument("<p>hello</p>"));
});
test("enforces schema nesting, node count, depth, empty content and duplicate images", () => {
  for (const value of [
    { type: "doc", content: [{ type: "text", text: "bad parent" }] },
    {
      type: "doc",
      content: [{ type: "listItem", content: [paragraph("bad parent")] }],
    },
    {
      type: "doc",
      content: [{ type: "bulletList", content: [paragraph("bad parent")] }],
    },
    { type: "doc", content: Array.from({ length: 2001 }, () => paragraph("")) },
    {
      type: "doc",
      content: [
        paragraph("正常问题描述"),
        ...Array.from({ length: 2 }, () => ({
          type: "inquiryImage",
          attrs: { id },
        })),
      ],
    },
    textDocument("   "),
    textDocument("x".repeat(5001)),
    textDocument("hello\0world"),
  ])
    assert.throws(() => validateRichDocument(value));
  let nested: RichNode = paragraph("嵌套问题描述");
  for (let i = 0; i < 15; i++)
    nested = { type: "blockquote", content: [nested] };
  assert.throws(() => validateRichDocument({ type: "doc", content: [nested] }));
});
test("server derives text and binds every image exactly once; formatting changes idempotency hash", async () => {
  const saved: { digest: string; message: string }[] = [];
  const handler = createInquiryHandler({
    enabled: true,
    origin,
    save: async (p) => {
      saved.push(p);
      return { reference: p.id, receivedAt: "2026-09-09T00:00:00Z" };
    },
  });
  async function post(content: unknown, image = false) {
    const form = new FormData();
    for (const [k, v] of Object.entries({
      email: "test@example.com",
      website: "",
      requestId: id,
      content: JSON.stringify(content),
    }))
      form.set(k, v);
    if (image)
      form.append(
        "images",
        new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
          type: "image/png",
        }),
        "x.png",
      );
    return handler(
      new Request(`${origin}/contact-preview/submit`, {
        method: "POST",
        headers: { origin },
        body: form,
      }),
    );
  }
  const doc = textDocument("只从正文提取文字");
  assert.equal((await post(doc)).status, 201);
  doc.content[0].content![0].marks = [{ type: "bold" }];
  assert.equal((await post(doc)).status, 201);
  assert.notEqual(saved[0].digest, saved[1].digest);
  assert.equal(saved[0].message, saved[1].message);
  assert.equal((await post(doc, true)).status, 400);
  doc.content.push({ type: "inquiryImage", attrs: { id } });
  assert.equal((await post(doc)).status, 400);
  assert.equal((await post(doc, true)).status, 201);
  const originalPhotoDigest = saved.at(-1)!.digest;
  doc.content[1].attrs = { id, width: 280 };
  assert.equal((await post(doc, true)).status, 201);
  assert.notEqual(saved.at(-1)!.digest, originalPhotoDigest);
  assert.equal(saved.at(-1)!.message, saved.at(-2)!.message);
});
