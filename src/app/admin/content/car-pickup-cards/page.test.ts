import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminLayout = readFileSync("src/app/admin/layout.tsx", "utf8");
const inventory = readFileSync("src/app/admin/content/inventory.ts", "utf8");
const page = readFileSync("src/app/admin/content/car-pickup-cards/page.tsx", "utf8");

test("Car pickup cards inventory card links to its inspection page", () => {
  assert.match(inventory, /"car-pickup-cards": "\/admin\/content\/car-pickup-cards"/);
});

test("inspection page renders the summary and requested read-only table", () => {
  for (const text of [
    "Pickup cards",
    "Unique pickup locations",
    "Configured images",
    "Public usage",
    "Image preview",
    "Pickup location",
    "Translation key",
    "Image source",
    "Public surface",
    "Status",
  ]) assert.match(page, new RegExp(text));
  assert.match(page, /Showing all \$\{rows\.length\} pickup cards/);
});

test("inspection page visibly renders every validation state", () => {
  for (const text of [
    "Duplicate pickup location",
    "Duplicate translation key",
    "Duplicate image",
    "Missing translation key",
    "Missing image",
    "Invalid image",
    "Image value malformed",
    "Unsupported image protocol",
    "Image host not permitted",
    "Image path not permitted",
    "Needs attention",
  ]) assert.match(page, new RegExp(text));
});

test("rejected image values render text instead of being passed to Next Image", () => {
  assert.match(page, /if \(row\.missingImage \|\| row\.invalidImage\)/);
  assert.match(page, /src=\{row\.image\}/);
  assert.ok(page.indexOf("if (row.missingImage || row.invalidImage)") < page.indexOf("src={row.image}"));
});

test("inspection page states its exact public scope without unnecessary controls", () => {
  assert.match(page, /public Cars landing page/);
  assert.match(page, /not car search results or vehicle inventory/);
  assert.doesNotMatch(page, /Filter|Search|Pagination|Previous|Next/);
  assert.doesNotMatch(page, /Create|Edit|Delete|Approve|Upload/);
});

test("inspection route inherits the existing admin permission boundary", () => {
  assert.match(adminLayout, /requireAdminSession\("\/admin"\)/);
  assert.doesNotMatch(page, /requireAdminSession|roles|permissions|authorization/i);
});
