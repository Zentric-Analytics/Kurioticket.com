import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHomepageDestinationHref,
  filterHomepageDestinationRows,
  getHomepageDestinationInventoryRows,
  getHomepageDestinationReuseStatuses,
  paginateHomepageDestinationRows,
  parseHomepageDestinationSearchParams,
} from "./page-data";

const rows = getHomepageDestinationInventoryRows();

test("selector retains all assignments and exposes audited unique counts", () => {
  assert.equal(rows.length, 272);
  assert.equal(new Set(rows.map((row) => row.recordId)).size, 168);
  assert.equal(new Set(rows.map((row) => row.route)).size, 146);
});

test("selector classifies direct, regional, and neutral/global assignments", () => {
  assert.equal(rows.find((row) => row.market === "US")?.assignmentType, "DIRECT_MARKET");
  assert.equal(rows.find((row) => row.market === "AFRICA")?.assignmentType, "REGIONAL_ALIAS");
  assert.equal(rows.find((row) => row.market === "GLOBAL")?.assignmentType, "NEUTRAL_GLOBAL_ALIAS");
});

test("reuse counts are source-derived without removing assignments", () => {
  for (const row of rows) {
    assert.equal(row.recordIdAssignmentCount, rows.filter((candidate) => candidate.recordId === row.recordId).length);
    assert.equal(row.routeAssignmentCount, rows.filter((candidate) => candidate.route === row.route).length);
    assert.equal(row.recordIdCountWithinMarket, rows.filter((candidate) => candidate.market === row.market && candidate.recordId === row.recordId).length);
    assert.equal(row.routeCountWithinMarket, rows.filter((candidate) => candidate.market === row.market && candidate.route === row.route).length);
  }
  assert.equal(rows.length, 272);
});

test("reuse classification distinguishes shared assignments from same-market duplicates", () => {
  assert.deepEqual(getHomepageDestinationReuseStatuses({ recordIdAssignmentCount: 2, routeAssignmentCount: 1, recordIdCountWithinMarket: 1, routeCountWithinMarket: 1 }), [
    { kind: "shared", subject: "ID", assignmentCount: 2 },
  ]);
  assert.deepEqual(getHomepageDestinationReuseStatuses({ recordIdAssignmentCount: 2, routeAssignmentCount: 3, recordIdCountWithinMarket: 2, routeCountWithinMarket: 2 }), [
    { kind: "duplicate", subject: "ID", assignmentCount: 2 },
    { kind: "duplicate", subject: "route", assignmentCount: 3 },
  ]);
});

test("search matches ID, city, origin, and destination code", () => {
  for (const query of ["us-new-york", "New York", "JFK", "EWR"]) {
    const filtered = filterHomepageDestinationRows(
      rows,
      parseHomepageDestinationSearchParams({ q: query }),
    );
    assert.ok(filtered.length > 0, `Expected results for ${query}`);
  }
});

test("market and assignment type filters compose with search", () => {
  const filtered = filterHomepageDestinationRows(
    rows,
    parseHomepageDestinationSearchParams({
      q: "London",
      market: "AFRICA",
      assignmentType: "REGIONAL_ALIAS",
    }),
  );

  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((row) => row.market === "AFRICA" && row.assignmentType === "REGIONAL_ALIAS"));
});

test("invalid filters are normalized and pagination retains every result", () => {
  const filters = parseHomepageDestinationSearchParams({ market: "UNKNOWN", assignmentType: "OTHER", page: "0" });
  assert.deepEqual(filters, { q: "", market: "ALL", assignmentType: "ALL", page: 1 });

  const lastPage = paginateHomepageDestinationRows(rows, 99);
  assert.equal(lastPage.currentPage, 11);
  assert.equal(lastPage.rows.length, 22);
});

test("pagination links preserve active filters", () => {
  assert.equal(
    buildHomepageDestinationHref(2, { q: "LHR", market: "EUROPE", assignmentType: "REGIONAL_ALIAS" }),
    "/admin/content/homepage-destinations?q=LHR&market=EUROPE&assignmentType=REGIONAL_ALIAS&page=2",
  );
});
