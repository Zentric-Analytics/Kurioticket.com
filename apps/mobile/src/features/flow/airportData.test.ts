import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { airports as sharedAirports } from "../../../../../src/shared/airports";
import { AIRPORT_SEARCH_RESULT_LIMIT, airports, searchAirports } from "./airportData";
import { airportByCode, defaultFlightForm, validateFlightForm } from "./flightSearchModel";

test("mobile consumes the shared catalogue and caps picker results", () => {
  assert.equal(airports, sharedAirports);
  assert.ok(airports.length > 12);
  assert.equal(searchAirports("").length, AIRPORT_SEARCH_RESULT_LIMIT);
});

test("mobile can still select and validate both route airports", () => {
  const from = airportByCode("LOS");
  const to = airportByCode("ENU");
  assert.ok(from && to);
  const errors = validateFlightForm({ ...defaultFlightForm(), from, to, departureDate: "2099-01-01", returnDate: "2099-01-02", adults: 1, cabin: "Economy" });
  assert.deepEqual(errors, {});
});

test("Metro airport dependency path stays platform-neutral", () => {
  const bridge = readFileSync(join(process.cwd(), "src/features/flow/airportData.ts"), "utf8");
  const shared = readFileSync(join(process.cwd(), "../../src/shared/airports/index.ts"), "utf8");
  assert.match(bridge, /src\/shared\/airports/);
  assert.doesNotMatch(`${bridge}\n${shared}`, /from ["'](?:next|react|node:|@\/lib|\.\.\/\.\.\/lib)|process\.env|window\.|document\.|Prisma/);
});
