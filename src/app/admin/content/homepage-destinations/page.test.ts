import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const adminLayout = readFileSync("src/app/admin/layout.tsx", "utf8");
const contentPage = readFileSync("src/app/admin/content/page.tsx", "utf8");
const inspectionPage = readFileSync("src/app/admin/content/homepage-destinations/page.tsx", "utf8");
const filterToolbar = readFileSync("src/app/admin/content/homepage-destinations/HomepageDestinationFilterToolbar.tsx", "utf8");
const tableComponent = readFileSync("src/components/admin/AdminPageShell.tsx", "utf8");

test("Content Inventory links only the homepage destination card to its inspection page", () => {
  assert.match(contentPage, /area\.href/);
  assert.match(contentPage, /View inventory/);
});

test("inspection page renders summary, revised table columns, reuse context, and result count", () => {
  for (const text of [
    "Unique card IDs",
    "Market assignments",
    "Unique routes",
    "Homepage usage",
    "Reuse",
    "Shared records can intentionally appear",
  ]) assert.match(inspectionPage, new RegExp(text));
  assert.match(inspectionPage, /matchingRows\.length/);
  assert.match(filterToolbar, /Search by ID, city, origin or destination code/);
  assert.match(filterToolbar, /All markets/);
  assert.match(filterToolbar, /All assignment types/);
  assert.equal((inspectionPage.match(/columns=\{\[/g) ?? []).length, 1);
  assert.doesNotMatch(inspectionPage, /Public role/);
  assert.ok(inspectionPage.includes("Duplicate ${status.subject} in market"));
  assert.ok(inspectionPage.includes("Shared ${status.subject}"));
  assert.match(inspectionPage, /row\.originCode} → {row\.destinationCode/);
});

test("filter toolbar delays a single row and conditionally offers Clear filters", () => {
  assert.match(filterToolbar, /md:grid-cols-2/);
  assert.match(filterToolbar, /xl:grid-cols-/);
  assert.match(filterToolbar, /hasActiveFilters \? <AdminLinkButton[^>]*>Clear filters/);
});

test("table contains overflow and applies the page-specific sticky navigation offset", () => {
  assert.match(tableComponent, /overflow-x-auto/);
  assert.match(tableComponent, /stickyHeaderClassName = "top-0"/);
  assert.match(inspectionPage, /stickyHeaderClassName="top-16 md:top-\[68px\]"/);
  assert.match(inspectionPage, /minWidth="940px"/);
});

test("inspection page preserves read-only scope", () => {
  assert.doesNotMatch(`${inspectionPage}${filterToolbar}`, /Create|Edit|Delete|Approve|Upload/);
});

test("inspection route preserves the existing parent admin permission boundary", () => {
  assert.match(adminLayout, /requireAdminSession\("\/admin"\)/);
});
