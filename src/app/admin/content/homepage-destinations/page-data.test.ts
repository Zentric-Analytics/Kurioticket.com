import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHomepageDestinationHref,
  filterHomepageDestinationRows,
  formatAssignmentType,
  formatMarketLabel,
  getHomepageDestinationInventoryRows,
  paginateHomepageDestinationRows,
  parseHomepageDestinationSearchParams,
} from "./page-data";

const rows = getHomepageDestinationInventoryRows();

test("market labels are readable while short country codes remain uppercase", () => {
  assert.equal(formatMarketLabel("MIDDLE_EAST"), "Middle East");
  assert.equal(formatMarketLabel("LATIN_AMERICA"), "Latin America");
  assert.equal(formatMarketLabel("US"), "US");
  assert.equal(formatMarketLabel("NG"), "NG");
  assert.equal(formatMarketLabel("CANADA"), "Canada");
  assert.doesNotMatch(formatMarketLabel("MIDDLE_EAST"), /_/);
});

test("selector retains all assignments and exposes audited unique counts", () => {
  assert.equal(rows.length, 272);
  assert.equal(new Set(rows.map((row) => row.recordId)).size, 168);
  assert.equal(new Set(rows.map((row) => row.route)).size, 146);
});

test("selector classifies direct, regional, and neutral/global assignments", () => {
  assert.equal(rows.find((row) => row.market === "US")?.assignmentType, "DIRECT_MARKET");
  assert.equal(rows.find((row) => row.market === "AFRICA")?.assignmentType, "REGIONAL_ALIAS");
  assert.equal(rows.find((row) => row.market === "GLOBAL")?.assignmentType, "NEUTRAL_GLOBAL_ALIAS");
  assert.deepEqual(
    ["DIRECT_MARKET", "REGIONAL_ALIAS", "NEUTRAL_GLOBAL_ALIAS"].map((type) =>
      formatAssignmentType(type as Parameters<typeof formatAssignmentType>[0]),
    ),
    ["Direct market", "Regional fallback", "Global fallback"],
  );
  assert.equal("publicRole" in rows[0], false);
});

test("selector derives ID and route assignment counts from the complete source inventory", () => {
  const repeatedIdRows = rows.filter((row) => row.repeatedId);
  const repeatedRouteRows = rows.filter((row) => row.repeatedRoute);
  const uniqueIdRow = rows.find((row) => rows.filter((candidate) => candidate.recordId === row.recordId).length === 1);
  const uniqueRouteRow = rows.find((row) => rows.filter((candidate) => candidate.route === row.route).length === 1);

  assert.ok(repeatedIdRows.length > 0);
  assert.ok(repeatedRouteRows.length > 0);
  assert.ok(uniqueIdRow);
  assert.ok(uniqueRouteRow);

  for (const row of rows) {
    const expectedIdCount = rows.filter((candidate) => candidate.recordId === row.recordId).length;
    const expectedRouteCount = rows.filter((candidate) => candidate.route === row.route).length;
    assert.equal(row.recordIdAssignmentCount, expectedIdCount);
    assert.equal(row.routeAssignmentCount, expectedRouteCount);
    assert.equal(row.repeatedId, expectedIdCount > 1);
    assert.equal(row.repeatedRoute, expectedRouteCount > 1);
  }

  assert.ok(repeatedIdRows[0].recordIdAssignmentCount > 1);
  assert.ok(repeatedRouteRows[0].routeAssignmentCount > 1);
  assert.equal(uniqueIdRow.recordIdAssignmentCount, 1);
  assert.equal(uniqueRouteRow.routeAssignmentCount, 1);
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

test("market filters retain and compare raw identifier values", () => {
  for (const market of ["MIDDLE_EAST", "LATIN_AMERICA"]) {
    const filters = parseHomepageDestinationSearchParams({ market });
    const filtered = filterHomepageDestinationRows(rows, filters);

    assert.equal(filters.market, market);
    assert.ok(filtered.length > 0);
    assert.ok(filtered.every((row) => row.market === market));
  }
});

test("assignment type query parameter values remain unchanged", () => {
  for (const assignmentType of ["DIRECT_MARKET", "REGIONAL_ALIAS", "NEUTRAL_GLOBAL_ALIAS"] as const) {
    assert.equal(parseHomepageDestinationSearchParams({ assignmentType }).assignmentType, assignmentType);
  }
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
