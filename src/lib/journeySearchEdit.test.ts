import assert from "node:assert/strict";
import test from "node:test";
import { changedJourneySearchFields } from "./journeySearchEdit";
import { safeJourneySearchEditFields } from "./search-journey";

const params = (value: string) => new URLSearchParams(value);

test("search edits report only names of approved fields changed at submission", () => {
  assert.deepEqual(changedJourneySearchFields("FLIGHT",
    params("origin=BOS&destination=LAX&tripType=one-way&departureDate=2027-04-01&adults=1"),
    params("from=BOS&to=LAX&tripType=one-way&departureDate=2027-04-04&adults=2&cabin=Business")), ["dates", "travelers", "cabin"]);
  assert.deepEqual(changedJourneySearchFields("HOTEL",
    params("destination=Paris&checkIn=2027-04-01&checkOut=2027-04-08&rooms=1&guests=2"),
    params("destination=London&checkIn=2027-04-01&checkOut=2027-04-08&rooms=2&adults=2")), ["destination", "rooms"]);
  assert.deepEqual(changedJourneySearchFields("CAR",
    params("pickupLocation=SEA&pickupTime=10:00"),
    params("pickupLocation=SEA&dropoffLocation=LAX&pickupTime=12:00&driverAge=24")), ["dropoff_location", "rental_times", "driver_age"]);
});

test("equivalent URL aliases, sorting, currency and ignored query data do not create search-edit fields", () => {
  assert.deepEqual(changedJourneySearchFields("FLIGHT",
    params("origin=bos&destination=LAX&adults=1&sort=best"),
    params("from=BOS&to=LAX&travelers=1&cabin=Economy&sort=price&token=private")), []);
  assert.deepEqual(changedJourneySearchFields("HOTEL", params("destination=Paris"), params("destination=paris&currency=CAD&provider=example")), []);
  assert.deepEqual(changedJourneySearchFields("CAR", params("pickupLocation=SEA"), params("pickupLocation=SEA&dropoffLocation=SEA")), []);
});

test("storage and reporting accept only the submitted product's approved field names", () => {
  assert.deepEqual(safeJourneySearchEditFields(["rooms", "rooms", "origin", "Paris", null], "HOTEL"), ["rooms"]);
  assert.deepEqual(safeJourneySearchEditFields(["cabin"], "CAR"), []);
  assert.deepEqual(safeJourneySearchEditFields(["dates"], "__proto__"), []);
});
