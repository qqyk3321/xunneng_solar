import test from "node:test";
import assert from "node:assert/strict";
import {
  createDownloadHandler,
  extractMessage,
  textExport,
} from "../lib/contact-submissions-preview/export";
import { createContactReader } from "../lib/contact-submissions-preview/server";
import type {
  RawSubmission,
  SubmissionPreviewData,
} from "../lib/contact-submissions-preview/model";

const id = "4583a8b3-a6a3-435d-b332-bfab81c1fb91";
const imageId = "4583a8b3-a6a3-435d-b332-bfab81c1fb92";
const paragraph = (text?: string) => ({
  type: "paragraph",
  ...(text ? { content: [{ type: "text", text }] } : {}),
});
const raw: RawSubmission = {
  id,
  email: "test@example.com",
  created_at: "2026-09-09T03:00:00Z",
  format: "rich",
  message: "stored derived text",
  content: {
    type: "doc",
    content: [
      { ...paragraph("  Before\nsecond line"), attrs: { textAlign: null } },
      paragraph(),
      { type: "inquiryImage", attrs: { id: imageId, width: 350 } },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "After" },
          { type: "hardBreak" },
          { type: "text", text: "末行  " },
        ],
      },
    ],
  },
  images: [
    {
      id: imageId,
      path: `${id}/${imageId}/0.webp`,
      mime: "image/webp",
      bytes: 1234,
    },
  ],
};
const saved: SubmissionPreviewData = {
  submission: {
    id,
    email: raw.email,
    createdAt: raw.created_at,
    format: "rich",
    message: raw.message,
    displayFormat: "rich",
    content: raw.content as SubmissionPreviewData["submission"]["content"],
    photos: [{ id: imageId }],
  },
  imageUrls: {
    [imageId]:
      "https://example.supabase.co/storage/v1/object/sign/photo?token=test",
  },
  missingImages: 0,
};

test("text export keeps literal newlines, empty paragraphs, hard breaks and image order", () => {
  assert.equal(
    extractMessage(saved),
    `  Before\nsecond line\n\n[Image 1]\n${saved.imageUrls[imageId]}\nAfter\n末行  `,
  );
  const output = textExport(saved, new Date("2026-09-09T04:00:00Z"));
  assert.match(output, /Email: test@example.com/);
  assert.match(output, /expire approximately one hour/);
  assert.ok(output.endsWith("After\n末行  \n"));
  assert.doesNotMatch(output, /stored derived text/);
});
test("plain text is not trimmed or reformatted, including CRLF and blank lines", () => {
  const message = "  literal <b>text</b>\r\n\r\nlast line\n\n";
  const plain: SubmissionPreviewData = {
    ...saved,
    submission: {
      ...saved.submission,
      displayFormat: "plain",
      format: "plain",
      content: null,
      photos: [],
      message,
    },
    imageUrls: {},
    missingImages: 0,
  };
  assert.equal(extractMessage(plain), message);
  assert.ok(textExport(plain).endsWith(`Message:\n${message}\n`));
  assert.doesNotMatch(textExport(plain), /expire approximately/);
  const legacy = {
    ...plain,
    submission: {
      ...plain.submission,
      format: null,
      photos: saved.submission.photos,
    },
    imageUrls: saved.imageUrls,
  };
  assert.equal(
    extractMessage(legacy),
    `${message}\n\n[Image 1]\n${saved.imageUrls[imageId]}`,
  );
});
test("lists retain their numbering and nested line breaks", () => {
  const content = {
    type: "doc" as const,
    content: [
      {
        type: "orderedList",
        attrs: { start: 4 },
        content: [
          {
            type: "listItem",
            content: [
              paragraph("first\ncontinued"),
              paragraph(),
              paragraph("last"),
            ],
          },
        ],
      },
      {
        type: "bulletList",
        content: [{ type: "listItem", content: [paragraph("bullet")] }],
      },
    ],
  };
  assert.equal(
    extractMessage({
      ...saved,
      submission: { ...saved.submission, content, photos: [] },
    }),
    "4. first\n   continued\n   \n   last\n- bullet",
  );
});
test("JSON export preserves raw fields, null attributes, dimensions and attachment metadata without signing", async () => {
  let signed = false;
  const handler = createDownloadHandler({
    enabled: true,
    loadRaw: async () => raw,
    loadPreview: async () => {
      signed = true;
      return saved;
    },
  });
  const response = await handler(id, "json");
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("Content-Disposition"),
    `attachment; filename="contact-${id}.json"`,
  );
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.match(
    response.headers.get("Content-Type")!,
    /application\/json; charset=utf-8/,
  );
  assert.deepEqual(await response.json(), raw);
  assert.equal(signed, false);
  const text = await handler(id, "text");
  assert.equal(signed, true);
  assert.match(text.headers.get("Content-Disposition")!, /\.txt"$/);
  assert.match(await text.text(), /\n\n\[Image 1\]\nhttps:/);
});
test("production and invalid inputs never load; failures cannot become downloaded error files", async () => {
  let calls = 0;
  const loadRaw = async () => {
    calls++;
    return raw;
  };
  const loadPreview = async () => {
    calls++;
    return saved;
  };
  assert.equal(
    (
      await createDownloadHandler({ enabled: false, loadRaw, loadPreview })(
        id,
        "json",
      )
    ).status,
    404,
  );
  const handler = createDownloadHandler({
    enabled: true,
    loadRaw,
    loadPreview,
  });
  assert.equal((await handler("invalid\r\n", "json")).status, 404);
  assert.equal((await handler(id, "html")).status, 400);
  assert.equal((await handler(id, null)).status, 400);
  assert.equal(calls, 0);
  const missing = await createDownloadHandler({
    enabled: true,
    loadRaw: async () => null,
    loadPreview: async () => null,
  })(id, "json");
  assert.equal(missing.status, 404);
  const broken = await createDownloadHandler({
    enabled: true,
    loadRaw,
    loadPreview: async () => ({ ...saved, missingImages: 1 }),
  })(id, "text");
  assert.equal(broken.status, 503);
  assert.equal(broken.headers.get("Content-Disposition"), null);
  const error = await createDownloadHandler({
    enabled: true,
    loadRaw: async () => {
      throw new Error("secret diagnostic");
    },
    loadPreview,
  })(id, "json");
  assert.equal(error.status, 503);
  assert.doesNotMatch(await error.text(), /secret/);
  assert.throws(() => extractMessage({ ...saved, imageUrls: {} }));
});
test("raw reader returns original data and is guarded without accessing storage", async () => {
  let calls = 0;
  const config = {
    enabled: true,
    url: "https://preview.supabase.co",
    key: "test-service-key",
    fetcher: async (input: RequestInfo | URL) => {
      calls++;
      const url = new URL(String(input));
      assert.equal(url.searchParams.get("id"), `eq.${id}`);
      assert.equal(
        url.searchParams.get("select"),
        "id,email,created_at,format,message,content,images",
      );
      return Response.json(raw);
    },
  };
  await assert.rejects(
    createContactReader({ ...config, enabled: false }).rawSubmission(id),
  );
  assert.equal(calls, 0);
  assert.deepEqual(await createContactReader(config).rawSubmission(id), raw);
  assert.equal(calls, 1);
});
