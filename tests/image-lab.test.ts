import assert from "node:assert/strict";
import test from "node:test";
import { createImageUploadHandler } from "../lib/image-lab/upload-handler";
import {
  detectImageMime,
  imageDimensions,
  MAX_IMAGE_BYTES,
} from "../lib/image-lab/config";

const origin = "http://192.168.1.176:3003";
const jpeg = new Uint8Array([255, 216, 255, 224, 1, 2, 3]);
function request(body: BodyInit = jpeg, headers: Record<string, string> = {}) {
  return new Request(origin + "/image-upload-preview/upload", {
    method: "POST",
    headers: { origin, "content-type": "image/jpeg", ...headers },
    body,
  });
}
function setup(enabled = true) {
  const stored: Uint8Array[] = [];
  const handler = createImageUploadHandler({
    enabled,
    origin,
    store: async (bytes, mime) => {
      stored.push(bytes);
      return {
        path: "test.jpg",
        signedUrl: "https://example.test/image",
        expiresAt: "2026-09-08",
        bytes: bytes.length,
        mime,
      };
    },
  });
  return { handler, stored };
}

test("passes exact original bytes to storage without server-side compression", async () => {
  const { handler, stored } = setup();
  const result = await handler(request());
  assert.equal(result.status, 200);
  assert.deepEqual(stored[0], jpeg);
  assert.equal((await result.json()).bytes, jpeg.length);
  assert.match(result.headers.get("cache-control") ?? "", /no-store/);
});
test("production is disabled before any storage operation", async () => {
  const { handler, stored } = setup(false);
  assert.equal((await handler(request())).status, 404);
  assert.equal(stored.length, 0);
});
test("rejects absent or foreign origins, not fooled by forwarded host", async () => {
  const { handler, stored } = setup();
  for (const value of ["", "https://example.test"]) {
    assert.equal(
      (
        await handler(
          request(jpeg, {
            origin: value,
            "x-forwarded-host": "192.168.1.176:3003",
          }),
        )
      ).status,
      403,
    );
  }
  assert.equal(stored.length, 0);
});
test("rejects SVG, false MIME signatures, and empty bodies", async () => {
  const { handler, stored } = setup();
  assert.equal(
    (await handler(request("<svg />", { "content-type": "image/svg+xml" })))
      .status,
    415,
  );
  assert.equal((await handler(request("not-an-image"))).status, 415);
  assert.equal(
    (await handler(request(jpeg, { "content-type": "image/png" }))).status,
    415,
  );
  assert.equal((await handler(request(new Uint8Array()))).status, 415);
  assert.equal(stored.length, 0);
});
test("rejects large declared bodies and enforces byte limit without Content-Length", async () => {
  const { handler, stored } = setup();
  assert.equal(
    (
      await handler(
        request(jpeg, { "content-length": String(MAX_IMAGE_BYTES + 1) }),
      )
    ).status,
    413,
  );
  assert.equal(
    (await handler(request(new Uint8Array(MAX_IMAGE_BYTES + 1)))).status,
    413,
  );
  assert.equal(stored.length, 0);
});
test("limits local request bursts and returns Retry-After", async () => {
  const { handler, stored } = setup();
  for (let i = 0; i < 30; i++)
    assert.equal((await handler(request())).status, 200);
  const response = await handler(request());
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal(stored.length, 30);
});
test("storage failures are generic and release concurrency slots", async () => {
  const handler = createImageUploadHandler({
    enabled: true,
    origin,
    store: async () => {
      throw new Error("SECRET must not leak");
    },
  });
  for (let i = 0; i < 3; i++) {
    const response = await handler(request());
    assert.equal(response.status, 503);
    assert.equal((await response.text()).includes("SECRET"), false);
  }
});
test("recognizes PNG, JPEG and WebP signatures", () => {
  assert.equal(detectImageMime(jpeg), "image/jpeg");
  assert.equal(
    detectImageMime(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/png",
  );
  assert.equal(
    detectImageMime(new TextEncoder().encode("RIFF0000WEBP")),
    "image/webp",
  );
  assert.equal(detectImageMime(new TextEncoder().encode("GIF89a")), null);
});
test("preserves aspect ratio, never upscales, supports pure quality mode", () => {
  assert.deepEqual(imageDimensions(4000, 3000, 1920), {
    width: 1920,
    height: 1440,
  });
  assert.deepEqual(imageDimensions(3000, 4000, 1280), {
    width: 960,
    height: 1280,
  });
  assert.deepEqual(imageDimensions(100, 60, 1920), { width: 100, height: 60 });
  assert.deepEqual(imageDimensions(4000, 3000), { width: 4000, height: 3000 });
});
