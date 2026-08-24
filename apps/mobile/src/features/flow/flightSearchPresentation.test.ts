import assert from "node:assert/strict";
import test from "node:test";
import { formatTravelerCabinSummary } from "./flightSearchPresentation";
import { initializeFlightForm, type FlightForm } from "./flightSearchModel";

const summary = (values: Partial<Pick<FlightForm, "adults" | "children" | "infants" | "cabin">>) => formatTravelerCabinSummary({
  adults: 0,
  children: 0,
  infants: 0,
  cabin: undefined,
  ...values,
});

test("traveler and cabin summary presents empty and partial committed states", () => {
  assert.equal(summary({}), "Select travelers, Select cabin");
  assert.equal(summary({ adults: 1 }), "1 adult, Select cabin");
  assert.equal(summary({ cabin: "Economy" }), "Select travelers, Economy");
});

test("fresh Flight initialization naturally presents the real defaults", () => {
  assert.equal(formatTravelerCabinSummary(initializeFlightForm({}, new Date(2026, 7, 1, 12)).form), "1 adult, Economy");
});

test("traveler and cabin summary uses composition with correct grammar", () => {
  assert.equal(summary({ adults: 1, cabin: "Economy" }), "1 adult, Economy");
  assert.equal(summary({ adults: 2, cabin: "Economy" }), "2 adults, Economy");
  assert.equal(summary({ adults: 2, children: 1, cabin: "Business" }), "2 adults, 1 child, Business");
  assert.equal(summary({ adults: 1, children: 2, infants: 1, cabin: "First" }), "1 adult, 2 children, 1 infant, First");
});
