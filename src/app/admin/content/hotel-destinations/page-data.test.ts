import assert from "node:assert/strict";
import test from "node:test";

import { activeHotelDestinationDisplayLocales, hotelDestinations } from "@/data/hotelDestinations";

import {
  buildHotelDestinationHref,
  detectHotelDestinationDuplicates,
  filterHotelDestinationRows,
  getHotelDestinationInventoryRows,
  getHotelDestinationSummary,
  paginateHotelDestinationRows,
  parseHotelDestinationSearchParams,
} from "./page-data";

const rows = getHotelDestinationInventoryRows();

test("selector derives every destination and summary metric from the live configuration", () => {
  const summary = getHotelDestinationSummary(rows);
  assert.equal(rows.length, hotelDestinations.length);
  assert.deepEqual(summary, { total: 83, cities: 78, airportAreas: 3, districts: 2, supportedDisplayLocales: 14 });
  assert.ok(rows.every((row) => row.localizationCoverage === activeHotelDestinationDisplayLocales.length));
});

test("search covers ID, name, country, region, search value, and alias", () => {
  const newYork = rows.find((row) => row.id === "us-new-york");
  assert.ok(newYork);
  for (const query of [newYork.id, newYork.name, newYork.country, newYork.region!, newYork.searchValue, newYork.aliases![0]]) {
    assert.ok(filterHotelDestinationRows(rows, parseHotelDestinationSearchParams({ q: query })).some((row) => row.rowId === newYork.rowId));
  }
});

test("country and destination-type filters compose", () => {
  const filtered = filterHotelDestinationRows(rows, parseHotelDestinationSearchParams({ country: "United States", kind: "airport-area" }));
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((row) => row.country === "United States" && row.kind === "airport-area"));
});

test("invalid filters normalize and pagination stays at 25 rows", () => {
  assert.deepEqual(parseHotelDestinationSearchParams({ country: "Atlantis", kind: "resort", page: "0" }), { q: "", country: "ALL", kind: "ALL", page: 1 });
  assert.equal(paginateHotelDestinationRows(rows, 1).rows.length, 25);
  const lastPage = paginateHotelDestinationRows(rows, 999);
  assert.equal(lastPage.currentPage, 4);
  assert.equal(lastPage.rows.length, 8);
});

test("duplicate detection flags all repeated values without removing records", () => {
  const fixtures = [hotelDestinations[0], { ...hotelDestinations[1], id: hotelDestinations[0].id, name: hotelDestinations[0].name.toUpperCase(), searchValue: ` ${hotelDestinations[0].searchValue} ` }];
  const duplicates = detectHotelDestinationDuplicates(fixtures);
  assert.equal(fixtures.length, 2);
  assert.ok(duplicates.ids.has(hotelDestinations[0].id));
  assert.ok(duplicates.names.has(hotelDestinations[0].name.toLocaleLowerCase()));
  assert.ok(duplicates.searchValues.has(hotelDestinations[0].searchValue.toLocaleLowerCase()));
});

test("pagination links retain active filters", () => {
  assert.equal(buildHotelDestinationHref(2, { q: "airport", country: "France", kind: "airport-area" }), "/admin/content/hotel-destinations?q=airport&country=France&kind=airport-area&page=2");
});
