import assert from "node:assert/strict";
import test from "node:test";
import { flightSearchSchema } from "@/lib/validation";
import { appendFlightLegParams, getSearchLegs, MULTI_CITY_MAX_LEGS, parseFlightLegParams, projectSearchLegs } from "./flightSearchJourney";

const travelers = { adults: 1, children: 0, infants: 0, travelers: 1, cabinClass: "economy" as const };
const leg = (origin: string, destination: string, departureDate: string) => ({ origin, destination, departureDate });

test("canonical legs project one-way and round-trip without two sources of truth", () => {
  const oneWay = { tripType: "one-way" as const, origin: "IAH", destination: "LHR", departureDate: "2099-09-10" };
  assert.deepEqual(getSearchLegs(oneWay), [leg("IAH", "LHR", "2099-09-10")]);
  const roundTrip = { ...oneWay, tripType: "round-trip" as const, returnDate: "2099-09-20" };
  assert.deepEqual(getSearchLegs(roundTrip), [leg("IAH", "LHR", "2099-09-10"), leg("LHR", "IAH", "2099-09-20")]);
});

test("indexed multi-city URL encoding is deterministic and bounded", () => {
  const legs = [leg("IAH", "LHR", "2099-09-10"), leg("LHR", "CDG", "2099-09-15"), leg("CDG", "JFK", "2099-09-22")];
  const params = new URLSearchParams();
  appendFlightLegParams(params, legs);
  assert.equal(params.toString(), "legCount=3&origin1=IAH&destination1=LHR&departureDate1=2099-09-10&origin2=LHR&destination2=CDG&departureDate2=2099-09-15&origin3=CDG&destination3=JFK&departureDate3=2099-09-22");
  assert.deepEqual(parseFlightLegParams(params), legs);
  params.set("legCount", String(MULTI_CITY_MAX_LEGS + 1));
  assert.deepEqual(parseFlightLegParams(params), []);
});

test("multi-city validation accepts two through five chronological legs", () => {
  for (const count of [2, 3, MULTI_CITY_MAX_LEGS]) {
    const legs = Array.from({ length: count }, (_, index) => leg(`A${index}A`, `B${index}B`, `2099-09-${String(10 + index).padStart(2, "0")}`));
    const projected = projectSearchLegs("multi-city", legs);
    const parsed = flightSearchSchema.safeParse({ ...projected, ...travelers });
    assert.equal(parsed.success, true);
    if (parsed.success) assert.deepEqual(parsed.data.legs, legs);
  }
});

test("multi-city validation rejects incomplete, excessive, same-airport, past, and reversed legs", () => {
  const valid = [leg("IAH", "LHR", "2099-09-10"), leg("LHR", "CDG", "2099-09-15")];
  const cases = [
    valid.slice(0, 1),
    Array.from({ length: MULTI_CITY_MAX_LEGS + 1 }, (_, index) => leg(`A${index}A`, `B${index}B`, `2099-09-${String(10 + index).padStart(2, "0")}`)),
    [leg("IAH", "IAH", "2099-09-10"), valid[1]],
    [leg("IAH", "LHR", "2020-01-01"), valid[1]],
    [valid[1], valid[0]],
    [leg("", "LHR", "2099-09-10"), valid[1]],
    [leg("IAH", "LHR", ""), valid[1]],
  ];
  for (const legs of cases) assert.equal(flightSearchSchema.safeParse({ ...projectSearchLegs("multi-city", legs), ...travelers }).success, false);
});

test("traveler and infant constraints remain unchanged for multi-city", () => {
  const legs = [leg("IAH", "LHR", "2099-09-10"), leg("LHR", "CDG", "2099-09-15")];
  assert.equal(flightSearchSchema.safeParse({ ...projectSearchLegs("multi-city", legs), ...travelers, adults: 1, infants: 2 }).success, false);
  assert.equal(flightSearchSchema.safeParse({ ...projectSearchLegs("multi-city", legs), ...travelers, adults: 9, children: 1 }).success, false);
});
