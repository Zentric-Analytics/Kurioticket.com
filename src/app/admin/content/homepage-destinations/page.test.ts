import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getHomepageDestinationSummary } from "./page-data";

const adminLayout = readFileSync("src/app/admin/layout.tsx", "utf8");
const contentPage = readFileSync("src/app/admin/content/page.tsx", "utf8");
const inspectionPage = readFileSync("src/app/admin/content/homepage-destinations/page.tsx", "utf8");
const filterToolbar = readFileSync("src/app/admin/content/homepage-destinations/HomepageDestinationFilterToolbar.tsx", "utf8");

test("Content Inventory links only the homepage destination card to its inspection page", () => {
  assert.match(contentPage, /area\.href/);
  assert.match(contentPage, /View inventory/);
});

test("inspection page renders summary, filters, seven table columns, and result count", () => {
  for (const text of [
    "Destination cards",
    "Distinct configured card records",
    "Homepage placements",
    "Total appearances across markets and fallback groups",
    "Routes covered",
    "Distinct origin-to-destination routes",
    "Record ID",
    "Destination city",
    "Homepage usage",
  ]) assert.match(inspectionPage, new RegExp(text));
  assert.match(inspectionPage, /matchingRows\.length/);
  assert.match(filterToolbar, /Search by ID, city, origin or destination code/);
  assert.match(filterToolbar, /All markets/);
  assert.match(filterToolbar, /All assignment types/);
  assert.doesNotMatch(inspectionPage, /Public role|publicRole/);
});

test("inspection page renders exactly three metrics derived from the existing inventory summary", () => {
  const metricCards = inspectionPage.match(/<AdminMetricCard\b/g) ?? [];
  assert.equal(metricCards.length, 3);

  assert.match(inspectionPage, /label="Destination cards"[\s\S]*?value=\{summary\.uniqueCardIds\}/);
  assert.match(inspectionPage, /label="Homepage placements"[\s\S]*?value=\{summary\.marketAssignments\}/);
  assert.match(inspectionPage, /label="Routes covered"[\s\S]*?value=\{summary\.uniqueRoutes\}/);

  assert.deepEqual(getHomepageDestinationSummary(), {
    uniqueCardIds: 168,
    marketAssignments: 272,
    uniqueRoutes: 146,
  });
});

test("inspection table fixes and left-aligns all seven columns with stable widths", () => {
  assert.match(inspectionPage, /fixedLayout/);
  assert.match(inspectionPage, /minWidth=\{null\}/);
  assert.match(inspectionPage, /tableClassName="min-w-\[900px\] lg:min-w-full"/);
  assert.doesNotMatch(inspectionPage, /minWidth="1180px"/);

  const configuredColumns = [
    ["market", "Market", "7%"],
    ["record-id", "Record ID", "19%"],
    ["origin", "Origin", "8%"],
    ["destination", "Destination", "9%"],
    ["destination-city", "Destination city", "20%"],
    ["route", "Route", "14%"],
    ["homepage-usage", "Homepage usage", "23%"],
  ];

  for (const [key, label, width] of configuredColumns) {
    assert.match(
      inspectionPage,
      new RegExp(`key: "${key}", label: "${label}", align: "left", width: "${width}"`),
    );
  }
  assert.equal(configuredColumns.reduce((total, column) => total + Number.parseInt(column[2], 10), 0), 100);
});

test("inspection table contains narrow-screen overflow without clipping or hiding its scrollbar", () => {
  assert.match(inspectionPage, /tableClassName="min-w-\[900px\] lg:min-w-full"/);
  assert.doesNotMatch(inspectionPage, /overflow-x-hidden|scrollbar-hide|clip|negative|translate-/);

  for (const key of ["record-id", "destination-city", "route", "homepage-usage"]) {
    assert.match(inspectionPage, new RegExp(`key: "${key}"[^\n]+cellClassName: "whitespace-normal break-words"`));
  }
});

test("reuse counts render as plain secondary text below their related values", () => {
  const idCell = inspectionPage.match(/<div key="id"[\s\S]*?<\/div>/)?.[0] ?? "";
  const routeCell = inspectionPage.match(/<div key="route"[\s\S]*?<\/div>/)?.[0] ?? "";

  assert.match(idCell, /row\.recordId[\s\S]*row\.recordIdAssignmentCount > 1[\s\S]*Used in \{row\.recordIdAssignmentCount\} assignments/);
  assert.match(routeCell, /row\.route[\s\S]*row\.routeAssignmentCount > 1[\s\S]*Used in \{row\.routeAssignmentCount\} assignments/);
  for (const cell of [idCell, routeCell]) {
    assert.match(cell, /className="cursor-text text-xs text-slate-500"/);
    assert.doesNotMatch(cell, /AdminStatusBadge|bg-|border|ring-|rounded|hover:|active:/);
  }
  const usageCell = inspectionPage.match(/<AdminStatusBadge key="type"[\s\S]*?<\/AdminStatusBadge>/)?.[0] ?? "";
  assert.match(usageCell, /formatAssignmentType\(row\.assignmentType\)/);
  assert.doesNotMatch(usageCell, /Used in|recordIdAssignmentCount|routeAssignmentCount/);
  assert.doesNotMatch(inspectionPage, /Repeated ID|Repeated route|Duplicate|Warning/);
  assert.doesNotMatch(inspectionPage, /justify-end/);
});

test("inspection page preserves read-only scope", () => {
  assert.doesNotMatch(`${inspectionPage}${filterToolbar}`, /Create|Edit|Delete|Approve|Upload/);
});

test("inspection route preserves the existing parent admin permission boundary", () => {
  assert.match(adminLayout, /requireAdminSession\("\/admin"\)/);
});
