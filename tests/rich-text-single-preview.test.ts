import test from "node:test";
import assert from "node:assert/strict";
import { parseSavedForm } from "../lib/rich-text-preview/form";
import { textDocument } from "../lib/anonymous-inquiry/rich-text";

const imageId = "4583a8b3-a6a3-435d-b332-bfab81c1fb91";
function fixture() {
  const content = textDocument("单份表单测试文字");
  content.content.push({ type: "inquiryImage", attrs: { id: imageId } });
  return {
    email: "demo@example.com",
    content,
    images: [
      {
        id: imageId,
        path: `single-form-preview/${imageId}/0.webp`,
        mime: "image/webp",
        bytes: 1000,
      },
    ],
  };
}
test("single form round trips text, image references, and image-free replacements", () => {
  assert.deepEqual(parseSavedForm(fixture()), fixture());
  const replacement = {
    email: "new@example.com",
    content: textDocument("替换后没有图片的表单"),
    images: [],
  };
  assert.deepEqual(parseSavedForm(replacement), replacement);
});
test("saved forms cannot sign foreign inquiry files, traversal, URLs, or invalid image metadata", () => {
  for (const path of [
    `${imageId}/${imageId}/0.webp`,
    `single-form-preview/../0.webp`,
    `single-form-preview/${imageId}/../../secret.png`,
    "https://example.com/image.webp",
    `single-form-preview/${imageId}/0.jpg`,
  ]) {
    const form = fixture();
    form.images[0].path = path;
    assert.throws(() => parseSavedForm(form));
  }
  for (const patch of [
    { id: "00000000-0000-4000-8000-000000000001" },
    { bytes: 0 },
    { bytes: 150 * 1024 + 1 },
    { mime: "image/svg+xml" },
  ]) {
    const form = fixture();
    Object.assign(form.images[0], patch);
    assert.throws(() => parseSavedForm(form));
  }
});
test("missing images, duplicate images, invalid documents and emails are rejected", () => {
  const form = fixture();
  assert.throws(() => parseSavedForm({ ...form, images: [] }));
  assert.throws(() =>
    parseSavedForm({ ...form, images: [...form.images, ...form.images] }),
  );
  assert.throws(() => parseSavedForm({ ...form, email: "invalid" }));
  assert.throws(() =>
    parseSavedForm({ ...form, content: "<script>alert(1)</script>" }),
  );
  assert.throws(() => parseSavedForm(null));
});
