import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const adminLayout = readFileSync("src/app/admin/layout.tsx", "utf8");
const contentPage = readFileSync("src/app/admin/content/page.tsx", "utf8");
const inspectionPage = readFileSync("src/app/admin/content/homepage-destinations/page.tsx", "utf8");
const filterToolbar = readFileSync("src/app/admin/content/homepage-destinations/HomepageDestinationFilterToolbar.tsx", "utf8");

test("Content Inventory links only the homepage destination card to its inspection page", () => {
  assert.match(contentPage, /area\.href/);
  assert.match(contentPage, /View inventory/);
});

test("inspection page renders summary, filters, all original columns, flags, and result count", () => {
  for (const text of [
    "Unique card IDs",
    "Market assignments",
    "Unique routes",
    "Record ID",
    "Destination city",
    "Assignment type",
    "Public role",
    "Repeated ID",
    "Repeated route",
  ]) assert.match(inspectionPage, new RegExp(text));
  assert.match(inspectionPage, /matchingRows\.length/);
  assert.match(filterToolbar, /Search by ID, city, origin or destination code/);
  assert.match(filterToolbar, /All markets/);
  assert.match(filterToolbar, /All assignment types/);
  const columnLabels = [...inspectionPage.matchAll(/label: "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(columnLabels, [
    "Market", "Record ID", "Origin", "Destination", "Destination city", "Route", "Assignment type", "Public role",
  ]);
  assert.doesNotMatch(columnLabels.join(" "), /Status|Flags|Reuse|Warning/);
});

test("repeated badges live with their identifying values and public role wraps on the left", () => {
  const recordCell = inspectionPage.slice(inspectionPage.indexOf('<div key="id"'), inspectionPage.indexOf("row.originCode"));
  const routeCell = inspectionPage.slice(inspectionPage.indexOf('<div key="route"'), inspectionPage.indexOf('<AdminStatusBadge key="type"'));
  const roleCell = inspectionPage.slice(inspectionPage.indexOf('<span key="role"'), inspectionPage.indexOf("],", inspectionPage.indexOf('<span key="role"')));

  assert.match(recordCell, /row\.recordId[\s\S]*row\.repeatedId[\s\S]*Repeated ID/);
  assert.match(routeCell, /row\.route[\s\S]*row\.repeatedRoute[\s\S]*Repeated route/);
  assert.doesNotMatch(roleCell, /Repeated ID|Repeated route|repeatedId|repeatedRoute/);
  assert.match(inspectionPage, /key: "public-role"[\s\S]*bodyClassName: "whitespace-normal text-left"/);
});

test("inspection table uses the admin navigation offset and a readable compact width", () => {
  assert.match(inspectionPage, /minWidth="1080px"/);
  assert.match(inspectionPage, /stickyHeaderClassName="top-16 md:top-\[68px\]"/);
});

test("filter toolbar waits until xl for a single-row layout", () => {
  assert.match(filterToolbar, /md:grid-cols-2/);
  assert.match(filterToolbar, /md:col-span-2 xl:col-span-1/);
  assert.match(filterToolbar, /xl:grid-cols-/);
  assert.doesNotMatch(filterToolbar, /md:grid-cols-\[/);
});

test("inspection page preserves read-only scope", () => {
  assert.doesNotMatch(`${inspectionPage}${filterToolbar}`, /Create|Edit|Delete|Approve|Upload/);
});

test("inspection route preserves the existing parent admin permission boundary", () => {
  assert.match(adminLayout, /requireAdminSession\("\/admin"\)/);
});
