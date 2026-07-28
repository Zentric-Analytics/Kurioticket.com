import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFlightRouteHref,
  filterFlightRouteRows,
  getFlightRouteInventoryRows,
  paginateFlightRouteRows,
  parseFlightRouteSearchParams,
} from "./page-data";

const rows = getFlightRouteInventoryRows();

test("selector preserves every configured pool membership and all route IDs", () => {
  assert.equal(rows.length, 596);
  assert.equal(new Set(rows.map((row) => row.routeId)).size, 340);
});

test("selector distinguishes default-US, regional, global, and fallback pools", () => {
  assert.equal(rows.filter((row) => row.poolType === "DEFAULT_US").length, 48);
  assert.equal(rows.filter((row) => row.poolType === "GLOBAL").length, 32);
  assert.equal(rows.filter((row) => row.poolType === "FALLBACK").length, 32);
  assert.ok(rows.some((row) => row.poolType === "REGIONAL"));
});

test("selector distinguishes visible, backup, and fallback memberships", () => {
  assert.ok(rows.some((row) => row.visibility === "VISIBLE"));
  assert.ok(rows.some((row) => row.visibility === "BACKUP"));
  assert.ok(rows.some((row) => row.visibility === "FALLBACK"));
});

test("selector flags duplicate route pairs without removing memberships", () => {
  const duplicate = rows.find((row) => row.duplicateRoutePair);
  assert.ok(duplicate);
  assert.ok(rows.filter((row) => row.route === duplicate.route).length > 1);
});

test("search matches route ID, origin, and destination", () => {
  const route = rows[0];
  for (const query of [route.routeId, route.originCode, route.destinationCode]) {
    assert.ok(filterFlightRouteRows(rows, parseFlightRouteSearchParams({ q: query })).length > 0);
  }
});

test("region, pool, and visibility filters compose", () => {
  const filtered = filterFlightRouteRows(rows, parseFlightRouteSearchParams({
    region: "US",
    poolType: "DEFAULT_US",
    visibility: "BACKUP",
  }));
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((row) => row.region === "US" && row.poolType === "DEFAULT_US" && row.visibility === "BACKUP"));
});

test("invalid filters normalize and pagination is fixed at 25 rows", () => {
  const filters = parseFlightRouteSearchParams({ region: "UNKNOWN", poolType: "OTHER", visibility: "HIDDEN", page: "0" });
  assert.deepEqual(filters, { q: "", region: "ALL", poolType: "ALL", visibility: "ALL", page: 1 });
  assert.equal(paginateFlightRouteRows(rows, 1).rows.length, 25);
  const lastPage = paginateFlightRouteRows(rows, 999);
  assert.equal(lastPage.currentPage, 24);
  assert.equal(lastPage.rows.length, 21);
});

test("pagination href preserves all active filters", () => {
  assert.equal(
    buildFlightRouteHref(3, { q: "LHR", region: "EUROPE", poolType: "REGIONAL", visibility: "VISIBLE" }),
    "/admin/content/flight-routes?q=LHR&region=EUROPE&poolType=REGIONAL&visibility=VISIBLE&page=3",
  );
});

