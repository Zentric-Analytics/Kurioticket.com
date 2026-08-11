import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDealsSearch } from "./dealsSearchParams";
import { buildFlightApiPayload } from "./dealsSearchParams";
import {
  buildDealsFlightSearchKey,
  buildDealsFlightSearchKeyFromPayload,
  buildDealsProductSearchKeys,
} from "./dealsProductSearchKeys";

const search = () => ({
  ...createDefaultDealsSearch(),
  flightOriginCode: "los",
  flightDestinationCode: "jfk",
  flightDepartureDate: "2027-01-01",
  flightReturnDate: "2027-01-10",
  hotelDestination: " New York ",
  hotelCheckIn: "2027-01-01",
  hotelCheckOut: "2027-01-10",
  carPickupLocation: "JFK",
  carPickupDate: "2027-01-01",
  carReturnDate: "2027-01-10",
});

test("product keys are deterministic and ignore presentation/package controls", () => {
  const base = search(),
    expected = buildDealsProductSearchKeys(base);
  assert.deepEqual(buildDealsProductSearchKeys({ ...base }), expected);
  assert.deepEqual(
    buildDealsProductSearchKeys({
      ...base,
      mode: "hotel-flight-car",
      stayDestinationLinked: false,
      stayDatesLinked: false,
      carPickupLinked: false,
      carDatesLinked: false,
    }),
    expected,
  );
  assert.deepEqual(
    buildDealsProductSearchKeys({
      ...base,
      displayCurrency: "EUR",
    } as typeof base),
    expected,
  );
});
test("Deals and validated Flight payloads produce the identical key", () => {
  const value = search();
  assert.equal(
    buildDealsFlightSearchKey(value),
    buildDealsFlightSearchKeyFromPayload(buildFlightApiPayload(value)),
  );
});
test("flight identity tracks cabin/passengers and one-way ignores stale return date", () => {
  const base = search(),
    keys = buildDealsProductSearchKeys(base);
  for (const changed of [
    { flightCabinClass: "business" as const },
    { flightAdults: 3 },
    { flightChildren: 1 },
    { flightInfants: 1 },
  ]) {
    const next = buildDealsProductSearchKeys({ ...base, ...changed });
    assert.notEqual(next.flight, keys.flight);
    assert.equal(next.hotel, keys.hotel);
    assert.equal(next.car, keys.car);
  }
  assert.equal(
    buildDealsProductSearchKeys({
      ...base,
      flightTripType: "one-way",
      flightReturnDate: "2027-02-01",
    }).flight,
    buildDealsProductSearchKeys({
      ...base,
      flightTripType: "one-way",
      flightReturnDate: "stale",
    }).flight,
  );
  assert.notEqual(
    buildDealsProductSearchKeys(base).flight,
    buildDealsProductSearchKeys({ ...base, flightReturnDate: "2027-01-11" })
      .flight,
  );
});
test("hotel and car dependencies are isolated", () => {
  const base = search(),
    keys = buildDealsProductSearchKeys(base);
  for (const changed of [{ hotelRooms: 2 }, { hotelPetFriendly: true }]) {
    const next = buildDealsProductSearchKeys({ ...base, ...changed });
    assert.notEqual(next.hotel, keys.hotel);
    assert.equal(next.flight, keys.flight);
    assert.equal(next.car, keys.car);
  }
  const car = buildDealsProductSearchKeys({ ...base, carPickupTime: "12:00" });
  assert.notEqual(car.car, keys.car);
  assert.equal(car.hotel, keys.hotel);
  assert.equal(car.flight, keys.flight);
});
