import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  adjustFlightDeparture,
  airportByCode,
  changeFlightTripType,
  flightSearchParams,
  initializeFlightForm,
  validateFlightForm,
} from "./flightSearchModel";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const today = new Date(2026, 7, 1, 12);

test("fresh homepage dates are empty with a manual-selection placeholder for every user", () => {
  const home = source("src/features/flow/HomeFlowScreen.tsx");
  const panel = source("src/features/flow/FlightSearchPanel.tsx");
  const fresh = initializeFlightForm({}, today).form;

  assert.match(home, /<FlightSearchPanel compact enableHomepageDefaultOrigin homepageAirportPicker \/>/);
  assert.doesNotMatch(home, /initializeHomepageDates/);
  assert.doesNotMatch(home, /isAuthenticated\s*\?[^:]*FlightSearchPanel/s);
  assert.equal(fresh.departureDate, "");
  assert.equal(fresh.returnDate, "");
  assert.match(panel, /: "Travel dates";/);
  assert.doesNotMatch(panel, /"Select (?:departure|return) date"/);
});

test("homepage departure selection preserves a valid return and clears an invalid return", () => {
  const fresh = initializeFlightForm({}, today).form;
  const selectedDeparture = adjustFlightDeparture(fresh, "2026-08-15").form;
  assert.equal(selectedDeparture.returnDate, "");

  const withReturn = { ...selectedDeparture, returnDate: "2026-08-30" };
  assert.equal(adjustFlightDeparture(withReturn, "2026-08-20").form.returnDate, "2026-08-30");
  assert.equal(adjustFlightDeparture(withReturn, "2026-09-01").form.returnDate, "");
});

test("one way ignores return and returning to round trip does not generate one", () => {
  const fresh = initializeFlightForm({}, today).form;
  const oneWay = changeFlightTripType(fresh, "one-way");
  assert.equal(validateFlightForm(oneWay, today).returnDate, undefined);
  assert.equal("returnDate" in flightSearchParams({
    ...oneWay,
    from: airportByCode("JFK"),
    to: airportByCode("LAX"),
    departureDate: "2026-08-15",
    adults: 1,
    cabin: "Economy",
  }), false);
  assert.equal(changeFlightTripType(oneWay, "round-trip").returnDate, "");
});

test("homepage preserves valid restored and route-param dates", () => {
  const dates = { departureDate: "2026-08-15", returnDate: "2026-08-22" };
  const restored = initializeFlightForm(dates, today).form;
  assert.equal(restored.departureDate, dates.departureDate);
  assert.equal(restored.returnDate, dates.returnDate);
});

test("no non-homepage screen opts into homepage date initialization", () => {
  const products = source("src/features/flow/ProductScreens.tsx");
  assert.doesNotMatch(products, /initializeHomepageDates/);
  assert.match(products, /<FlightSearchPanel ref=\{panel\} params=\{params\} \/>/);
});
