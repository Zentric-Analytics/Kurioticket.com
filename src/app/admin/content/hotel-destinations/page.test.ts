import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminLayout = readFileSync("src/app/admin/layout.tsx", "utf8");
const inventory = readFileSync("src/app/admin/content/inventory.ts", "utf8");
const page = readFileSync("src/app/admin/content/hotel-destinations/page.tsx", "utf8");
const toolbar = readFileSync("src/app/admin/content/hotel-destinations/HotelDestinationFilterToolbar.tsx", "utf8");
const pageData = readFileSync("src/app/admin/content/hotel-destinations/page-data.ts", "utf8");

test("Hotel search destinations card links to the read-only inspection page", () => {
  assert.match(inventory, /href: "\/admin\/content\/hotel-destinations"/);
});

test("page renders metrics, requested columns, usage, and anomaly flags", () => {
  for (const text of ["Total search destinations", "Cities", "Airport areas", "Districts", "Supported display locales", "Destination ID", "Country code", "Search value", "Aliases", "Localisation coverage", "Public usage", "Duplicate ID", "Duplicate search value", "Repeated name", "Search &amp; autocomplete"]) {
    assert.match(page, new RegExp(text));
  }
  assert.match(page, /not homepage hotel cards/);
  assert.match(page, /matchingRows\.length/);
});

test("toolbar has search, country, and destination-type filters", () => {
  assert.match(toolbar, /Search by ID, name, country, region, search value or alias/);
  assert.match(toolbar, /All countries/);
  assert.match(toolbar, /All destination types/);
});

test("page renders all supported type labels and no mutation actions", () => {
  for (const type of ["City", "District", "Airport area", "Landmark"]) assert.match(`${page}${toolbar}${pageData}`, new RegExp(type));
  assert.doesNotMatch(`${page}${toolbar}`, /Create|Edit|Delete|Approve|Upload/);
});

test("inspection route inherits the existing admin permission boundary", () => {
  assert.match(adminLayout, /requireAdminSession\("\/admin"\)/);
  assert.doesNotMatch(page, /requireAdminSession|roles|permissions|authorization/i);
});
