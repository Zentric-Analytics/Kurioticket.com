import assert from "node:assert/strict";
import test from "node:test";
import type { FlightResult } from "../../api/travelApi";
import { emptyFlightFilters, filterAndSortFlights, flightFilterOptions } from "./flightFilters";
const flight = (id: string, airlineName: string, stops: number, departureTime: string, price: number, valueScore: number) => ({ id, airlineName, stops, departureTime, price, valueScore } as FlightResult);
const live = [flight("a", "Air One", 0, "2026-09-01T08:00:00", 300, 9), flight("b", "Air Two", 1, "2026-09-01T14:00:00", 100, 5), flight("c", "Air One", 2, "2026-09-01T20:00:00", 200, 7)];
test("derives only live stop, airline and departure-time options", () => assert.deepEqual(flightFilterOptions(live), { stops: ["nonstop", "one", "twoPlus"], airlines: ["Air One", "Air Two"], times: ["morning", "afternoon", "evening"] }));
test("stops, airlines and times filter the loaded set", () => { assert.deepEqual(filterAndSortFlights(live, { ...emptyFlightFilters(), stops: ["one"] }, "best").map(x => x.id), ["b"]); assert.deepEqual(filterAndSortFlights(live, { ...emptyFlightFilters(), airlines: ["Air One"] }, "best").map(x => x.id), ["a", "c"]); assert.deepEqual(filterAndSortFlights(live, { ...emptyFlightFilters(), times: ["evening"] }, "best").map(x => x.id), ["c"]); });
test("clear restores results, filtering does not mutate provider data, and price sort composes", () => { const before = live.slice(); assert.deepEqual(filterAndSortFlights(live, { ...emptyFlightFilters(), airlines: ["Air One"] }, "price").map(x => x.id), ["c", "a"]); assert.deepEqual(filterAndSortFlights(live, emptyFlightFilters(), "best").map(x => x.id), ["a", "c", "b"]); assert.deepEqual(live, before); });
