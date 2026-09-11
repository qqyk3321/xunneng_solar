import test from "node:test";
import assert from "node:assert/strict";
import { createContactReader } from "../lib/contact-submissions-preview/server";
import { createPreviewHandler } from "../lib/contact-submissions-preview/preview-handler";
import {
  listOptions,
  listHref,
  parseSubmission,
} from "../lib/contact-submissions-preview/model";

const id = "4583a8b3-a6a3-435d-b332-bfab81c1fb91";
const imageId = "4583a8b3-a6a3-435d-b332-bfab81c1fb92";
const attempt = "4583a8b3-a6a3-435d-b332-bfab81c1fb93";
const metadata = {
  id,
  email: "test@example.com",
  created_at: "2026-09-09T03:00:00Z",
  format: "rich",
};
const photo = {
  id: imageId,
  path: `${id}/${attempt}/0.webp`,
  mime: "image/webp",
  bytes: 87100,
};
const content = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Saved message text" }],
    },
    { type: "inquiryImage", attrs: { id: imageId, width: 350 } },
  ],
};
const row = {
  ...metadata,
  message: "Saved message text",
  content,
  images: [photo],
};
const json = (value: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
const config = {
  enabled: true,
  url: "https://preview.supabase.co",
  key: "test-service-key",
};

test("modal endpoint is development-only, strips storage metadata, and never caches receipts", async () => {
  let calls = 0;
  const saved = {
    submission: parseSubmission(row),
    imageUrls: { [imageId]: "https://preview.supabase.co/signed-photo" },
    missingImages: 0,
  };
  const load = async () => {
    calls++;
    return saved;
  };
  assert.equal(
    (await createPreviewHandler({ enabled: false, load })(id)).status,
    404,
  );
  assert.equal(
    (await createPreviewHandler({ enabled: true, load })("invalid")).status,
    404,
  );
  assert.equal(calls, 0);
  const response = await createPreviewHandler({ enabled: true, load })(id);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  const body = await response.json();
  assert.deepEqual(body.submission.photos, [{ id: imageId }]);
  assert.equal(body.submission.email, metadata.email);
  assert.equal(body.submission.content.content[1].attrs.width, 350);
  assert.equal(
    (await createPreviewHandler({ enabled: true, load: async () => null })(id))
      .status,
    404,
  );
  const failed = await createPreviewHandler({
    enabled: true,
    load: async () => {
      throw new Error("secret backend diagnostic");
    },
  })(id);
  assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /secret backend/);
});

test("URL parameters allow only supported sizes and sort columns; links stay local", () => {
  assert.deepEqual(listOptions(), {
    page: 1,
    size: 10,
    sort: "created_at",
    direction: "desc",
  });
  assert.deepEqual(
    listOptions({ page: "2", size: "25", sort: "email", direction: "asc" }),
    { page: 2, size: 25, sort: "email", direction: "asc" },
  );
  for (const page of ["0", "-1", "1.5", "Infinity", "9999999999", ["2", "3"]])
    assert.equal(listOptions({ page }).page, 1);
  assert.equal(
    listOptions({
      size: "1000000",
      sort: "email);DROP TABLE",
      direction: "arbitrary",
    }).size,
    10,
  );
  assert.equal(
    listOptions({ sort: ["email", "created_at"] }).sort,
    "created_at",
  );
  assert.match(
    listHref(listOptions()),
    /^\/contact-submissions-preview\?page=1&size=10&sort=created_at&direction=desc$/,
  );
});
test("saved rich content preserves width; legacy plain messages and attachments remain readable", () => {
  assert.equal(parseSubmission(row).content?.content[1].attrs?.width, 350);
  const plain = {
    ...row,
    format: "plain",
    content: null,
    images: [],
    message: "<script>alert(1)</script>\nLiteral text",
  };
  assert.equal(parseSubmission(plain).message, plain.message);
  assert.equal(parseSubmission(plain).displayFormat, "plain");
  const legacy = parseSubmission({
    ...row,
    format: null,
    content: null,
    images: [{ ...photo, id: undefined }],
  });
  assert.equal(legacy.displayFormat, "plain");
  assert.equal(legacy.photos[0].id, "legacy-0");
  assert.equal(parseSubmission({ ...row, format: null }).displayFormat, "rich");
});
test("invalid and foreign image metadata never reaches signing", () => {
  for (const image of [
    { ...photo, path: `${attempt}/${attempt}/0.webp` },
    { ...photo, path: `single-form-preview/${attempt}/0.webp` },
    { ...photo, path: `${id}/../0.webp` },
    { ...photo, path: `https://evil.test/0.webp` },
    { ...photo, path: `${id}/${attempt}/1.webp` },
    { ...photo, mime: "image/svg+xml" },
    { ...photo, bytes: 0 },
    { ...photo, id: attempt },
  ])
    assert.throws(() => parseSubmission({ ...row, images: [image] }));
  assert.throws(() => parseSubmission({ ...row, images: [] }));
  assert.throws(() => parseSubmission({ ...row, format: "plain" }));
  assert.throws(() => parseSubmission({ ...row, content: { type: "script" } }));
});
test("production, missing configuration and malformed IDs do not query Supabase", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls++;
    throw new Error("Must not fetch");
  };
  await assert.rejects(
    createContactReader({ ...config, enabled: false, fetcher }).list(
      listOptions(),
    ),
  );
  await assert.rejects(
    createContactReader({ ...config, enabled: false, fetcher }).submission(id),
  );
  await assert.rejects(
    createContactReader({ ...config, key: undefined, fetcher }).list(
      listOptions(),
    ),
  );
  assert.equal(
    await createContactReader({ ...config, fetcher }).submission("bad-id"),
    null,
  );
  assert.equal(calls, 0);
});
test("server pages the complete collection with stable sorting and metadata-only selection", async () => {
  const calls: { url: URL; init?: RequestInit }[] = [];
  const reader = createContactReader({
    ...config,
    fetcher: async (input, init) => {
      calls.push({ url: new URL(String(input)), init });
      if (init?.method === "HEAD")
        return new Response(null, { headers: { "content-range": "*/23" } });
      return json([metadata]);
    },
  });
  const result = await reader.list(
    listOptions({ page: "2", sort: "email", direction: "asc" }),
  );
  assert.equal(result.total, 23);
  assert.equal(result.pages, 3);
  assert.equal(result.options.page, 2);
  assert.equal(
    calls[1].url.searchParams.get("select"),
    "id,email,created_at,format",
  );
  assert.equal(calls[1].url.searchParams.get("order"), "email.asc,id.asc");
  assert.equal(calls[1].url.searchParams.get("offset"), "10");
  assert.equal(calls[1].url.searchParams.get("limit"), "10");
  assert.ok(calls.every((call) => call.init?.cache === "no-store"));
  assert.equal(result.rows[0].email, metadata.email);
  const clamped = await reader.list(listOptions({ page: "999999" }));
  assert.equal(clamped.options.page, 3);
  assert.equal(calls[3].url.searchParams.get("offset"), "20");
});
test("genuine empty collections are distinct from count and list failures", async () => {
  let calls = 0;
  const empty = await createContactReader({
    ...config,
    fetcher: async () => {
      calls++;
      return new Response(null, { headers: { "content-range": "*/0" } });
    },
  }).list(listOptions());
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.rows, []);
  assert.equal(calls, 1);
  await assert.rejects(
    createContactReader({
      ...config,
      fetcher: async () => new Response(null, { status: 403 }),
    }).list(listOptions()),
  );
  await assert.rejects(
    createContactReader({
      ...config,
      fetcher: async (_input, init) =>
        init?.method === "HEAD"
          ? new Response(null, { headers: { "content-range": "*/12" } })
          : json({ message: "failure" }, 403),
    }).list(listOptions()),
  );
});
test("detail lookup signs only bound private paths and keeps text on missing images", async () => {
  let signedPaths: string[] = [];
  let signingWorks = true;
  const reader = createContactReader({
    ...config,
    fetcher: async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname.startsWith("/rest/")) {
        assert.equal(url.searchParams.get("id"), `eq.${id}`);
        return json(row);
      }
      assert.match(
        url.pathname,
        /\/object\/sign\/anonymous-inquiry-images-preview$/,
      );
      const body = JSON.parse(String(init?.body));
      signedPaths = body.paths;
      assert.equal(body.expiresIn, 3600);
      return signingWorks
        ? json([
            {
              path: photo.path,
              signedURL: `/object/sign/anonymous-inquiry-images-preview/${photo.path}?token=test`,
            },
          ])
        : json({ message: "missing" }, 404);
    },
  });
  const saved = await reader.submission(id);
  assert.deepEqual(signedPaths, [photo.path]);
  assert.ok(saved?.imageUrls[imageId]);
  assert.equal(saved?.missingImages, 0);
  signingWorks = false;
  const missing = await reader.submission(id);
  assert.equal(missing?.missingImages, 1);
  assert.equal(missing?.submission.message, row.message);
});
test("unknown submissions return null; database failures are not reported as missing", async () => {
  assert.equal(
    await createContactReader({
      ...config,
      fetcher: async () => json(null),
    }).submission(id),
    null,
  );
  await assert.rejects(
    createContactReader({
      ...config,
      fetcher: async () => json({ message: "failure" }, 403),
    }).submission(id),
  );
  let calls = 0;
  await assert.rejects(
    createContactReader({
      ...config,
      fetcher: async () => {
        calls++;
        return json({ ...row, images: [{ ...photo, path: "foreign/path" }] });
      },
    }).submission(id),
  );
  assert.equal(calls, 1);
});
