import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminLayout = readFileSync("src/app/admin/layout.tsx", "utf8");
const inventory = readFileSync("src/app/admin/content/inventory.ts", "utf8");
const page = readFileSync("src/app/admin/content/faqs/page.tsx", "utf8");
const toolbar = readFileSync("src/app/admin/content/faqs/FaqInventoryFilterToolbar.tsx", "utf8");

test("FAQ definitions card links to its inspection page", () => {
  assert.match(inventory, /"faqs": "\/admin\/content\/faqs"/);
});

test("page renders derived metrics, requested columns, and result count", () => {
  for (const text of ["Total FAQ definitions", "General/support definitions", "Cars definitions", "FAQ collections", "Collection", "FAQ ID", "Question key", "Answer key", "English fallback question", "Public surface", "Localisation behaviour", "Status"]) {
    assert.match(page, new RegExp(text));
  }
  assert.match(page, /Showing \$\{rows\.length\} of \$\{allRows\.length\} FAQ definitions/);
});

test("page renders all warning states and runtime rendering caveats", () => {
  for (const text of ["Duplicate FAQ ID", "Duplicate question key", "Duplicate answer key", "Duplicate English fallback question", "Missing fallback question", "Missing fallback answer text", "Translated question collision"]) {
    assert.match(page, new RegExp(text));
  }
  assert.match(page, /Public text is localised at runtime/);
  assert.match(page, /rendered counts may differ when translated questions collide/);
  assert.match(page, /not customer support ticket content/);
});

test("toolbar provides only requested search and collection controls", () => {
  assert.match(toolbar, /Search by FAQ ID, question key, answer key or English fallback question/);
  assert.match(toolbar, /All FAQ collections/);
  assert.doesNotMatch(`${page}${toolbar}`, /Pagination|Previous|Next/);
});

test("inspection UI remains read-only", () => {
  assert.doesNotMatch(`${page}${toolbar}`, /Create|Edit|Delete|Approve|Upload/);
});

test("inspection route inherits the existing admin permission boundary", () => {
  assert.match(adminLayout, /requireAdminSession\("\/admin"\)/);
  assert.doesNotMatch(page, /requireAdminSession|roles|permissions|authorization/i);
});
