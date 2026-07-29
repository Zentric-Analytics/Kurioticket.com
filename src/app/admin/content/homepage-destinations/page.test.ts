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

test("inspection page renders summary, filters, table columns, flags, and result count", () => {
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
});

test("inspection table fixes and left-aligns all eight columns with stable widths", () => {
  assert.match(inspectionPage, /fixedLayout/);

  const configuredColumns = [
    ["market", "Market", "7%"],
    ["record-id", "Record ID", "15%"],
    ["origin", "Origin", "8%"],
    ["destination", "Destination", "10%"],
    ["destination-city", "Destination city", "15%"],
    ["route", "Route", "10%"],
    ["assignment-type", "Assignment type", "17%"],
    ["public-role", "Public role", "18%"],
  ];

  for (const [key, label, width] of configuredColumns) {
    assert.match(
      inspectionPage,
      new RegExp(`key: "${key}", label: "${label}", align: "left", width: "${width}"`),
    );
  }
  assert.equal(configuredColumns.reduce((total, column) => total + Number.parseInt(column[2], 10), 0), 100);
});

test("Public role opts out of final-column right alignment and wrapping constraint", () => {
  assert.match(inspectionPage, /label: "Public role", align: "left"/);
  assert.match(inspectionPage, /cellClassName: "whitespace-normal"/);
  assert.doesNotMatch(inspectionPage, /justify-end/);
});

test("inspection page preserves read-only scope", () => {
  assert.doesNotMatch(`${inspectionPage}${filterToolbar}`, /Create|Edit|Delete|Approve|Upload/);
});

test("inspection route preserves the existing parent admin permission boundary", () => {
  assert.match(adminLayout, /requireAdminSession\("\/admin"\)/);
});
