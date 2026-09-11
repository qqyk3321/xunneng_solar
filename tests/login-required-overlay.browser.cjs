/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS browser test. */
// Requires an already running app. Never starts/stops a server or signs in.
// PLAYWRIGHT_MODULE may point to an existing local Playwright installation.
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const esbuild = require("esbuild");
const base = process.env.PREVIEW_TEST_ORIGIN || "http://192.168.1.176:3003";
const project = path.resolve(__dirname, "..");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const screenshots = fs.mkdtempSync(path.join(os.tmpdir(), "login-overlay-"));
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 850 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    const response = await page.goto(base + "/my-submissions-preview", {
      waitUntil: "domcontentloaded",
    });
    assert.equal(response.status(), 200);
    assert.match(response.headers()["cache-control"], /no-store/);
    const modal = page.getByRole("dialog", {
      name: "Please sign in to continue",
    });
    const login = page.getByRole("link", { name: "Sign in now" });
    await modal.waitFor();
    await page.waitForFunction(
      () =>
        document.activeElement?.tagName === "A" &&
        document.activeElement.textContent.trim() === "Sign in now" &&
        document.body.style.overflow === "hidden",
      null,
      { polling: 100 },
    );
    assert.equal(await page.locator("table").count(), 0);
    assert.equal(await page.locator("[inert]").count(), 1);
    assert.equal(
      await page.locator("[inert]").getAttribute("aria-hidden"),
      "true",
    );
    assert.equal(
      await page
        .locator("[inert]")
        .evaluate((el) => getComputedStyle(el).userSelect),
      "none",
    );
    assert.deepEqual(
      await page.evaluate(() => [
        document.body.style.overflow,
        document.documentElement.style.overflow,
      ]),
      ["hidden", "hidden"],
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await page
        .getByRole("link", { name: "Back to homepage", exact: true })
        .evaluate((el) => document.activeElement === el),
      true,
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await login.evaluate((el) => document.activeElement === el),
      true,
    );
    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await page
        .getByRole("link", { name: "Back to homepage", exact: true })
        .evaluate((el) => document.activeElement === el),
      true,
    );
    await page.keyboard.press("Escape");
    await page.mouse.click(8, 8);
    assert.equal(await modal.count(), 1);
    const originalUrl = page.url();
    await page
      .locator("[inert] a")
      .first()
      .evaluate((el) => el.focus());
    assert.equal(
      await page
        .locator("[inert]")
        .evaluate((el) => el.contains(document.activeElement)),
      false,
    );
    await page.mouse.wheel(0, 900);
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    for (const width of [320, 375, 1280]) {
      await page.setViewportSize({ width, height: 850 });
      const box = await modal.boundingBox();
      assert.ok(
        box.x >= 0 && box.x + box.width <= width,
        `dialog overflow at ${width}`,
      );
      await page.screenshot({ path: path.join(screenshots, `${width}.png`) });
    }
    await page.clock.runFor(4000);
    assert.equal(page.url(), originalUrl);
    assert.match(await modal.getByRole("status").innerText(), /1 second/);
    await page.clock.runFor(1000);
    await page.waitForURL(
      (url) =>
        url.pathname === "/auth-preview" &&
        url.searchParams.get("returnTo") === "/my-submissions-preview",
    );
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.notEqual(
      await page.evaluate(() => document.body.style.overflow),
      "hidden",
    );
    console.log(
      "PASS live route: no private table, inert background, keyboard/mouse/scroll lock, 320/375/1280 layout, exact 5-second redirect and safe return path.",
    );

    await page.goto(base + "/my-submissions-preview", {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("link", { name: "Sign in now" }).click();
    await page.waitForURL((url) => url.pathname === "/auth-preview");
    await page.goto(base + "/my-submissions-preview", {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByRole("link", { name: "Back to homepage", exact: true })
      .click();
    await page.waitForURL("**/home-preview");
    await page.clock.runFor(6000);
    assert.equal(new URL(page.url()).pathname, "/home-preview");
    console.log(
      "PASS live buttons: immediate sign-in and return home; no delayed redirect after leaving.",
    );

    // Real component in an isolated document to verify unmount/cleanup and
    // inactive/error-state behavior, without forging a server auth session.
    const bundle = await esbuild.build({
      absWorkingDir: project,
      bundle: true,
      write: false,
      outfile: "/tmp/login-overlay-harness.js",
      jsx: "automatic",
      define: { "process.env.NODE_ENV": '"development"' },
      stdin: {
        loader: "tsx",
        resolveDir: project,
        contents: `
        import React from 'react'; import {createRoot} from 'react-dom/client';
        import {LoginRequiredOverlay} from './components/login-required-overlay';
        const root=createRoot(document.getElementById('root'));
        document.body.style.overflow='auto';document.documentElement.style.overflow='scroll';
        window.clicks=0;
        window.renderOverlay=(required,returnTo='/my-submissions-preview')=>root.render(<React.StrictMode><LoginRequiredOverlay required={required} returnTo={returnTo}><button id="background" onClick={()=>window.clicks++}>Background control</button></LoginRequiredOverlay></React.StrictMode>);
        window.renderOverlay(true);
      `,
      },
    });
    const js = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text;
    const css = bundle.outputFiles.find((f) => f.path.endsWith(".css")).text;
    await page.route("**/isolated-login-overlay", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html><head><style>body{margin:0}${css}</style></head><body><div id="root"></div><script src="/isolated-login-overlay.js"></script></body></html>`,
      }),
    );
    await page.route("**/isolated-login-overlay.js", (route) =>
      route.fulfill({ contentType: "text/javascript", body: js }),
    );
    await page.goto(base + "/isolated-login-overlay");
    await modal.waitFor();
    await page.clock.runFor(2000);
    await page.evaluate(() => window.renderOverlay(false));
    await modal.waitFor({ state: "detached" });
    assert.deepEqual(
      await page.evaluate(() => [
        document.body.style.overflow,
        document.documentElement.style.overflow,
      ]),
      ["auto", "scroll"],
    );
    assert.equal(await page.locator("[inert]").count(), 0);
    await page.getByRole("button", { name: "Background control" }).click();
    assert.equal(await page.evaluate(() => window.clicks), 1);
    await page.clock.runFor(6000);
    assert.equal(new URL(page.url()).pathname, "/isolated-login-overlay");
    await page.evaluate(() =>
      window.renderOverlay(true, "https://example.com"),
    );
    await modal.waitFor();
    assert.equal(await login.getAttribute("href"), "/auth-preview");
    await page.clock.runFor(1000);
    assert.match(await modal.getByRole("status").innerText(), /4 seconds/);
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(
      "PASS reusable component: StrictMode, no countdown when inactive, cleanup restores interactions/scroll, reactivation resets countdown, unsafe return rejected; no JS errors.",
    );

    const noJS = await browser.newContext({ javaScriptEnabled: false });
    const fallback = await noJS.newPage();
    await fallback.goto(base + "/my-submissions-preview");
    assert.equal(await fallback.getByRole("dialog").count(), 1);
    assert.equal(await fallback.locator("[inert]").count(), 1);
    assert.equal(await fallback.locator("table").count(), 0);
    await fallback.getByRole("link", { name: "Sign in now" }).click();
    await fallback.waitForURL((url) => url.pathname === "/auth-preview");
    await noJS.close();
    console.log(
      "PASS JavaScript-disabled fallback: protected data absent, background inert, manual sign-in link works.",
    );
    console.log("Screenshots: " + screenshots);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
