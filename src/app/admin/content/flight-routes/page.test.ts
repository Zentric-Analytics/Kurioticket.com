import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminLayout = readFileSync("src/app/admin/layout.tsx", "utf8");
const inventory = readFileSync("src/app/admin/content/inventory.ts", "utf8");
const contentPage = readFileSync("src/app/admin/content/page.tsx", "utf8");
const page = readFileSync("src/app/admin/content/flight-routes/page.tsx", "utf8");
const toolbar = readFileSync("src/app/admin/content/flight-routes/FlightRouteFilterToolbar.tsx", "utf8");

test("Configured flight fare routes card links to its inspection page", () => {
  assert.match(inventory, /href: "\/admin\/content\/flight-routes"/);
  assert.match(contentPage, /View inventory/);
});

test("inspection page renders requested summary and table structure", () => {
  for (const text of [
    "Total configured route IDs",
    "Default-US routes",
    "Global routes",
    "Route ID",
    "Market or region",
    "Pool type",
    "Visibility",
    "Status",
    "Duplicate route pair",
  ]) assert.match(page, new RegExp(text));
  assert.match(page, /matchingRows\.length/);
});

test("toolbar renders all requested read-only filters", () => {
  assert.match(toolbar, /Search by route ID, origin or destination/);
  assert.match(toolbar, /All markets and regions/);
  assert.match(toolbar, /All pool types/);
  assert.match(toolbar, /All visibility/);
});

test("inspection page has no mutation or refresh actions", () => {
  assert.doesNotMatch(`${page}${toolbar}`, /Create|Edit|Delete|Approve|Refresh|Upload/);
});

test("inspection route preserves the parent admin permission boundary", () => {
  assert.match(adminLayout, /requireAdminSession\("\/admin"\)/);
});
