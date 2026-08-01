import * as assert from "node:assert/strict";
import { test } from "node:test";

import { AIRPORT_RESULT_LIMIT, airports, searchAirports } from "./index";
import { airports as websiteAirports } from "../../data/airports";

test("website and shared airport exports are the same catalogue", () => {
  assert.equal(websiteAirports, airports);
  assert.ok(airports.length > 12);
});

test("catalogue contains the required Nigerian airports with complete coordinates", () => {
  for (const code of ["LOS", "ABV", "PHC", "KAN", "ENU"]) {
    const airport = airports.find((candidate) => candidate.code === code);
    assert.ok(airport, `${code} should exist`);
    assert.equal(airport.countryCode, "NG");
    assert.equal(airport.country, "Nigeria");
    assert.equal(typeof airport.latitude, "number");
    assert.equal(typeof airport.longitude, "number");
  }
});

test("local search ranks exact IATA first and searches city, airport, and country", () => {
  assert.equal(searchAirports("los")[0]?.code, "LOS");
  assert.ok(searchAirports("Port Harcourt").some(({ code }) => code === "PHC"));
  assert.ok(searchAirports("Akanu Ibiam").some(({ code }) => code === "ENU"));
  assert.ok(searchAirports("Nigeria").some(({ code }) => code === "LOS"));
});

test("local search enforces its default and explicit result limits", () => {
  assert.equal(searchAirports("").length, AIRPORT_RESULT_LIMIT);
  assert.equal(searchAirports("international", 3).length, 3);
});
