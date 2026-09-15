/* Default: mocked submissions. HOME_CONTACT_LIVE_WRITE=1: creates two test inquiries, no emails. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { createClient } = require("@supabase/supabase-js");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");

async function main() {
  const origin = process.env.PREVIEW_TEST_ORIGIN || "http://192.168.1.176:3003";
  const live = process.env.HOME_CONTACT_LIVE_WRITE === "1";
  const faq = process.env.HOME_CONTACT_PATH === "/faq";
  const sectionId = faq ? "ask-question" : "contact-us";
  const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), "home-contact-"));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
  });
  const errors = [],
    requests = [],
    receipts = [];
  const testEmail = `home-contact-${Date.now()}@example.com`;
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    assert.equal(
      await page.locator("#contact-us").count(),
      1,
      "The redesigned homepage includes Contact us",
    );
    await page.goto(
      `${origin}${process.env.HOME_CONTACT_PATH || "/"}#${sectionId}`,
      {
        waitUntil: "domcontentloaded",
      },
    );
    const section = page.locator(`#${sectionId}`);
    assert.doesNotMatch(
      await section.innerText(),
      /TEST FEATURE|sample information|form is being tested/,
    );
    assert.equal(
      await section
        .getByRole("link", { name: "support@solortide.com", exact: true })
        .getAttribute("href"),
      "mailto:support@solortide.com",
    );
    const form = page.getByRole("form", {
      name: faq ? "Ask a question" : "Contact us",
      exact: true,
    });
    const send = form.getByRole("button", {
      name: "Send message",
      exact: true,
    });
    await page.waitForFunction(
      (id) => !document.querySelector(`#${id} button[type="submit"]`).disabled,
      sectionId,
    );
    await section.scrollIntoViewIfNeeded();
    assert.equal(
      await section.getByRole("button", { name: /preview/i }).count(),
      0,
    );
    await send.click();
    await form.getByRole("alert").filter({ hasText: "valid email" }).waitFor();
    await form.getByLabel("Email address").fill(testEmail);
    await send.click();
    await form.getByRole("alert").filter({ hasText: "5,000" }).waitFor();
    const plainText =
      "Could you help us choose a solar setup?\nThis is a test message. No email response needed.";
    await form.getByLabel("Your message").fill(plainText);
    await section.screenshot({
      path: path.join(artifacts, "contact-desktop.png"),
    });
    await page.route("**/api/contact", async (route) => {
      const request = route.request();
      const body = await new Request(request.url(), {
        method: "POST",
        headers: { "content-type": request.headers()["content-type"] },
        body: request.postDataBuffer(),
      }).formData();
      const images = await Promise.all(
        body.getAll("images").map(async (file) => ({
          bytes: file.size,
          mime: file.type,
          hash: createHash("sha256")
            .update(Buffer.from(await file.arrayBuffer()))
            .digest("hex"),
        })),
      );
      requests.push({
        id: body.get("requestId"),
        format: body.get("format"),
        email: body.get("email"),
        content: JSON.parse(body.get("content")),
        images,
      });
      let receipt;
      if (live) {
        const response = await route.fetch({ timeout: 120000 });
        assert.equal(
          response.status(),
          201,
          `Live save failed: ${await response.text()}`,
        );
        receipt = await response.json();
      } else
        receipt = {
          reference: body.get("requestId"),
          receivedAt: new Date().toISOString(),
          content: JSON.parse(body.get("content")),
        };
      receipts.push(receipt);
      // First receipt is lost after commit; the retry must not duplicate this inquiry.
      if (requests.length === 1)
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: "We couldn't confirm your submission. Please try again.",
          }),
        });
      else
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(receipt),
        });
    });
    await send.click();
    await form
      .getByRole("alert")
      .filter({ hasText: "confirm your submission" })
      .waitFor({ timeout: 120000 });
    assert.equal(await form.getByLabel("Your message").inputValue(), plainText);
    assert.equal(
      await section
        .getByRole("heading", { name: "We’ve received your request." })
        .count(),
      0,
    );
    await send.click();
    await section
      .getByRole("heading", {
        name: "We’ve received your request.",
        exact: true,
      })
      .waitFor({ timeout: 120000 });
    assert.equal(requests[0].id, requests[1].id);
    assert.equal(receipts[0].reference, receipts[1].reference);
    assert.equal(requests[0].format, "plain");
    assert.equal(requests[0].images.length, 0);
    assert.match(await section.innerText(), /48 hours/);
    await section.screenshot({
      path: path.join(artifacts, "plain-success.png"),
    });
    await section
      .getByRole("button", { name: "Send another message", exact: true })
      .click();

    await form
      .getByLabel("Your message")
      .fill("Photos of our roof. Please help us understand the options.");
    await form.getByRole("button", { name: "Add photos", exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: "A little more detail.",
      exact: true,
    });
    await dialog.waitFor();
    const editor = dialog.locator(
      '#contact-rich-message[contenteditable="true"]',
    );
    await editor.waitFor();
    assert.equal(
      await dialog.getByLabel("Email address").inputValue(),
      testEmail,
    );
    assert.match(await editor.innerText(), /Photos of our roof/);
    assert.equal(
      await page.evaluate(() => document.body.style.overflow),
      "hidden",
    );
    assert.equal(
      await dialog.getByRole("button", { name: /preview/i }).count(),
      0,
    );
    // Native modal keeps keyboard focus inside and background controls inert.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      assert.ok(
        await dialog.evaluate((el) => el.contains(document.activeElement)),
      );
    }
    await editor.press("ControlOrMeta+End");
    await dialog.getByRole("button", { name: "Headings", exact: true }).click();
    await dialog.getByRole("menuitem", { name: /Heading 2/i }).click();
    assert.equal(await editor.locator("h2").count(), 1);
    await dialog
      .getByRole("button", { name: "Align center", exact: true })
      .click();
    assert.equal(
      await editor.locator("h2").evaluate((el) => el.style.textAlign),
      "center",
    );
    await dialog.getByRole("button", { name: "Headings", exact: true }).click();
    await dialog.getByRole("menuitem", { name: /Heading 2/i }).click();
    await dialog.getByRole("button", { name: "Lists", exact: true }).click();
    await dialog
      .getByRole("menuitem", { name: "Bullet List", exact: true })
      .click();
    assert.equal(await editor.locator("ul").count(), 1);
    await dialog.getByRole("button", { name: "Lists", exact: true }).click();
    await dialog
      .getByRole("menuitem", { name: "Bullet List", exact: true })
      .click();
    await editor.press("ControlOrMeta+End");
    await editor.press("Enter");
    const photoInput = dialog.getByLabel("Choose photos");
    await photoInput.setInputFiles({
      name: "bad.png",
      mimeType: "image/png",
      buffer: Buffer.from("invalid image"),
    });
    await dialog
      .getByRole("alert")
      .filter({ hasText: "JPG, PNG or WebP" })
      .waitFor();
    await photoInput.setInputFiles(
      "docs/ChatGPT_Image_Sep_4,_2026,_03_28_04_PM.png",
    );
    await dialog
      .getByRole("button", { name: "Remove photo 1", exact: true })
      .waitFor();
    const photo = editor.locator("img");
    await photo.evaluate((img) => img.decode());
    const initialPhoto = await photo.boundingBox();
    assert.ok(
      initialPhoto.width <= 281 && initialPhoto.height <= 181,
      "Inserted photo starts small",
    );
    const handle = editor.getByRole("button", { name: /Resize photo/ });
    await handle.scrollIntoViewIfNeeded();
    const corner = await handle.boundingBox();
    await page.mouse.move(
      corner.x + corner.width / 2,
      corner.y + corner.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      corner.x + corner.width / 2 + 90,
      corner.y + corner.height / 2 + 50,
      { steps: 8 },
    );
    await page.mouse.up();
    const resizedPhoto = await photo.boundingBox();
    assert.ok(
      resizedPhoto.width > initialPhoto.width + 60,
      "Official handle enlarges the photo",
    );
    assert.ok(
      Math.abs(
        resizedPhoto.width / resizedPhoto.height -
          initialPhoto.width / initialPhoto.height,
      ) < 0.02,
      "Aspect ratio preserved",
    );
    await dialog.getByRole("button", { name: "Undo", exact: true }).click();
    assert.ok(
      Math.abs((await photo.boundingBox()).width - initialPhoto.width) < 2,
    );
    await dialog.getByRole("button", { name: "Redo", exact: true }).click();
    assert.ok(
      Math.abs((await photo.boundingBox()).width - resizedPhoto.width) < 2,
    );
    await handle.focus();
    await page.keyboard.press("ArrowLeft");
    const savedPhotoWidth = Math.round((await photo.boundingBox()).width);
    assert.ok(
      savedPhotoWidth < resizedPhoto.width - 10,
      "Keyboard resize works",
    );
    await handle.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const pointer = (type, offset) =>
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerType: "touch",
          pointerId: 42,
          clientX: rect.x + 5 + offset,
          clientY: rect.y + 5,
        });
      el.dispatchEvent(pointer("pointerdown", 0));
      document.dispatchEvent(pointer("pointermove", 30));
      document.dispatchEvent(pointer("pointerup", 30));
    });
    const touchWidth = (await photo.boundingBox()).width;
    assert.ok(
      touchWidth > savedPhotoWidth + 20,
      "Touch pointer adapter resizes and commits",
    );
    await page.mouse.move(5, 5);
    assert.ok(
      Math.abs((await photo.boundingBox()).width - touchWidth) < 1,
      "Touch end stops resizing",
    );
    await dialog.getByRole("button", { name: "Undo", exact: true }).click();
    assert.ok(
      Math.abs((await photo.boundingBox()).width - savedPhotoWidth) < 2,
    );
    await editor.press("ControlOrMeta+End");
    await page.keyboard.insertText("The photo above is only a test fixture.");
    assert.equal(requests.length, 2, "Photos must remain local before sending");
    await dialog
      .getByRole("button", { name: "Remove photo 1", exact: true })
      .click();
    await dialog.getByRole("button", { name: "Undo", exact: true }).click();
    await dialog
      .getByRole("button", { name: "Remove photo 1", exact: true })
      .waitFor();
    // Escape must close the modal even when the editor would consume the shortcut.
    await editor.focus();
    await editor.evaluate((element) =>
      element.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Escape") event.preventDefault();
        },
        { once: true },
      ),
    );
    await page.evaluate(() => {
      window.__contactEscape = [];
      for (const capture of [true, false])
        document.addEventListener(
          "keydown",
          (event) => {
            if (event.key === "Escape")
              window.__contactEscape.push({
                capture,
                prevented: event.defaultPrevented,
                target: event.target?.outerHTML?.slice(0, 250),
                menus: document.querySelectorAll(
                  '[role="menu"][data-state="open"]',
                ).length,
              });
          },
          { capture },
        );
    });
    await page.keyboard.press("Escape");
    try {
      await dialog.waitFor({ state: "hidden", timeout: 5000 });
    } catch (error) {
      console.error(
        "Escape diagnostics",
        await page.evaluate(() => window.__contactEscape),
      );
      throw error;
    }
    assert.notEqual(
      await page.evaluate(() => document.body.style.overflow),
      "hidden",
    );
    await form
      .getByRole("button", { name: "Continue editing", exact: true })
      .click();
    await dialog.waitFor();
    assert.equal(await editor.locator("img").count(), 1);
    assert.ok(
      Math.abs((await photo.boundingBox()).width - savedPhotoWidth) < 2,
      "Draft keeps resized width",
    );
    assert.match(await editor.innerText(), /photo above/);
    assert.doesNotMatch(await dialog.innerText(), /[\u3400-\u9fff]/);
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
        `Dialog overflow at ${width}`,
      );
      assert.ok(
        await editor.evaluate((el) => el.scrollWidth <= el.clientWidth),
        `Editor overflow at ${width}`,
      );
      await page.screenshot({
        path: path.join(artifacts, `photo-dialog-${width}.png`),
      });
    }
    const modalSend = dialog.getByRole("button", {
      name: "Send message",
      exact: true,
    });
    await modalSend.click();
    await dialog
      .getByRole("heading", {
        name: "We’ve received your request.",
        exact: true,
      })
      .waitFor({ timeout: 120000 });
    assert.equal(requests[2].format, "rich");
    assert.notEqual(requests[2].id, requests[0].id);
    assert.equal(requests[2].images.length, 1);
    assert.equal(
      requests[2].content.content.find((node) => node.type === "inquiryImage")
        .attrs.width,
      savedPhotoWidth,
    );
    assert.ok(requests[2].images[0].bytes <= 150 * 1024);
    assert.match(await dialog.innerText(), /48 hours/);
    await page.screenshot({ path: path.join(artifacts, "photo-success.png") });
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    await section
      .getByRole("heading", {
        name: "We’ve received your request.",
        exact: true,
      })
      .waitFor();
    await section
      .getByRole("button", { name: "Send another message", exact: true })
      .click();
    assert.equal(await form.getByLabel("Your message").inputValue(), "");
    for (const width of [320, 375, 768]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await section.evaluate((el) => el.scrollWidth <= el.clientWidth),
      );
      if (width === 375)
        await section.screenshot({
          path: path.join(artifacts, "contact-mobile.png"),
        });
    }
    if (live) {
      const admin = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } },
      );
      const result = await admin
        .from("anonymous_inquiries_preview")
        .select("id,email,message,content,format,images")
        .eq("email", testEmail);
      assert.ifError(result.error);
      assert.equal(
        result.data.length,
        2,
        "Distinct messages append; retry does not duplicate",
      );
      for (const submitted of [requests[0], requests[2]]) {
        const row = result.data.find((row) => row.id === submitted.id);
        assert.ok(row);
        assert.equal(row.format, submitted.format);
        assert.deepEqual(row.content, submitted.content);
        if (row.format === "plain") assert.equal(row.message, plainText);
        for (const [index, image] of row.images.entries()) {
          const file = await admin.storage
            .from("anonymous-inquiry-images-preview")
            .download(image.path);
          assert.ifError(file.error);
          assert.equal(
            createHash("sha256")
              .update(Buffer.from(await file.data.arrayBuffer()))
              .digest("hex"),
            submitted.images[index].hash,
          );
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify(
        {
          ok: true,
          live,
          ids: [requests[0].id, requests[2].id],
          imageBytes: requests[2].images[0].bytes,
          retryDeduplicated: true,
          draftRetained: true,
          englishUI: true,
          artifacts,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
