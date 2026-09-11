import assert from "node:assert/strict";
import test from "node:test";
import { previewReturnPath } from "../lib/supabase-auth/return-path";

test("only the independent account preview pages are allowed return paths", () => {
  assert.equal(previewReturnPath("/home-preview"), "/home-preview");
  assert.equal(
    previewReturnPath("/my-submissions-preview"),
    "/my-submissions-preview",
  );
});

test("absent or ambiguous return paths preserve existing auth navigation", () => {
  for (const value of [
    undefined,
    "",
    ["/home-preview"],
    ["/home-preview", "/"],
  ]) {
    assert.equal(previewReturnPath(value), null);
  }
});

test("external URLs and unexpected internal paths cannot become redirects", () => {
  for (const value of [
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "javascript:alert(1)",
    "/",
    "/consultation",
    "/home-preview?next=https://example.com",
    "/home-preview/../consultation",
    "%2Fhome-preview",
  ]) {
    assert.equal(previewReturnPath(value), null);
  }
});
