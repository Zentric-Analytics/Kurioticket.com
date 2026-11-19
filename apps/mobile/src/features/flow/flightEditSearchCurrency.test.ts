import assert from "node:assert/strict";
import test from "node:test";

import {
  flightEditSearchParams,
  flightSearchParams,
  initializeFlightForm,
} from "./flightSearchModel";
import { buildSearchPlan } from "./travelSearchModel";

const now = new Date("2026-09-01T12:00:00Z");

test("multi-city Edit Search preserves a non-USD currency in the canonical target key", () => {
  const route = {
    tripType: "multi-city",
    legCount: "2",
    origin: "LOS",
    destination: "JFK",
    departureDate: "2026-10-10",
    origin1: "LOS",
    destination1: "LHR",
    departureDate1: "2026-10-10",
    origin2: "LHR",
    destination2: "JFK",
    departureDate2: "2026-10-12",
    adults: "1",
    children: "0",
    infants: "0",
    travelers: "1",
    cabinClass: "economy",
    currency: "ngn",
  };

  const originalPlan = buildSearchPlan("flight", route, now).plan;
  assert.ok(originalPlan);
  assert.equal(originalPlan.payload.currency, "NGN");

  const editParams = flightEditSearchParams(route);
  assert.equal(editParams.currency, "NGN");

  const form = initializeFlightForm(editParams, now).form;
  assert.equal(form.currency, "NGN");

  const submitted = flightSearchParams(form);
  assert.equal(submitted.currency, "NGN");

  const targetPlan = buildSearchPlan("flight", submitted, now).plan;
  assert.ok(targetPlan);
  assert.equal(targetPlan.key, originalPlan.key);
});
