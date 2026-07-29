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

test("inspection page renders summary, filters, seven table columns, flags, and result count", () => {
  for (const text of [
    "Unique card IDs",
    "Market assignments",
    "Unique routes",
    "Record ID",
    "Destination city",
    "Homepage usage",
    "Repeated ID",
    "Repeated route",
  ]) assert.match(inspectionPage, new RegExp(text));
  assert.match(inspectionPage, /matchingRows\.length/);
  assert.match(filterToolbar, /Search by ID, city, origin or destination code/);
  assert.match(filterToolbar, /All markets/);
  assert.match(filterToolbar, /All assignment types/);
  assert.doesNotMatch(inspectionPage, /Public role|publicRole/);
});

test("inspection table fixes and left-aligns all seven columns with stable widths", () => {
  assert.match(inspectionPage, /fixedLayout/);

  const configuredColumns = [
    ["market", "Market", "8%"],
    ["record-id", "Record ID", "17%"],
    ["origin", "Origin", "9%"],
    ["destination", "Destination", "11%"],
    ["destination-city", "Destination city", "18%"],
    ["route", "Route", "15%"],
    ["homepage-usage", "Homepage usage", "22%"],
  ];

  for (const [key, label, width] of configuredColumns) {
    assert.match(
      inspectionPage,
      new RegExp(`key: "${key}", label: "${label}", align: "left", width: "${width}"`),
    );
  }
  assert.equal(configuredColumns.reduce((total, column) => total + Number.parseInt(column[2], 10), 0), 100);
});

test("repeated warnings sit below their related values and not in homepage usage", () => {
  assert.match(inspectionPage, /key="id" className="flex flex-col items-start"[\s\S]*row\.recordId[\s\S]*row\.repeatedId[\s\S]*Repeated ID/);
  assert.match(inspectionPage, /key="route" className="flex flex-col items-start"[\s\S]*row\.route[\s\S]*row\.repeatedRoute[\s\S]*Repeated route/);
  const usageCell = inspectionPage.match(/<AdminStatusBadge key="type"[\s\S]*?<\/AdminStatusBadge>/)?.[0] ?? "";
  assert.match(usageCell, /formatAssignmentType\(row\.assignmentType\)/);
  assert.doesNotMatch(usageCell, /Repeated ID|Repeated route/);
  assert.doesNotMatch(inspectionPage, /justify-end/);
});

test("inspection page preserves read-only scope", () => {
  assert.doesNotMatch(`${inspectionPage}${filterToolbar}`, /Create|Edit|Delete|Approve|Upload/);
});

test("inspection route preserves the existing parent admin permission boundary", () => {
  assert.match(adminLayout, /requireAdminSession\("\/admin"\)/);
});
