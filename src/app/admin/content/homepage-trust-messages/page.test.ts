import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminLayout = readFileSync("src/app/admin/layout.tsx", "utf8");
const inventory = readFileSync("src/app/admin/content/inventory.ts", "utf8");
const page = readFileSync("src/app/admin/content/homepage-trust-messages/page.tsx", "utf8");

test("Homepage trust messages card links to its inspection page", () => {
  assert.match(inventory, /"homepage-trust-messages": "\/admin\/content\/homepage-trust-messages"/);
});

test("page renders source-derived metrics and the requested table contract", () => {
  for (const text of ["Homepage trust messages", "Unique message IDs", "Title translation coverage", "Body translation coverage", "Public usage", "Message ID", "English fallback title", "English fallback body", "Title translation key", "Body translation key", "Localisation coverage", "Public surface", "Status"]) {
    assert.match(page, new RegExp(text));
  }
  assert.match(page, /Showing all \$\{rows\.length\} homepage trust messages/);
});

test("page visibly renders duplicate, missing, and raw-key warning states", () => {
  for (const text of ["Duplicate message ID", "Duplicate title key", "Duplicate body key", "Missing English fallback title", "Missing English fallback body", "Missing title:", "Missing body:", "Title falls back to raw key:", "Body falls back to raw key:"]) {
    assert.match(page, new RegExp(text));
  }
});

test("page states the exact homepage-only scope and remains read-only", () => {
  assert.match(page, /three trust messages rendered on the public homepage/);
  assert.match(page, /localised at runtime/);
  assert.match(page, /scoped only to homepage trust messages/);
  assert.match(page, /does not represent Cars, Hotels or other trust-content surfaces/);
  assert.match(page, /excludes the trust-section heading and subtitle unless they are added as separate inventory records/);
  assert.doesNotMatch(page, /Search|Filter|Pagination|Previous|Next/);
  assert.doesNotMatch(page, /Create|Edit|Delete|Approve|Upload/);
});

test("inspection route inherits the existing admin permission boundary", () => {
  assert.match(adminLayout, /requireAdminSession\("\/admin"\)/);
  assert.doesNotMatch(page, /requireAdminSession|roles|permissions|authorization/i);
});
