import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultDealsSearch,
  parseDealsSearchParams,
  serializeDealsSearchParams,
  type DealsSearch,
} from "./dealsSearchParams";
import {
  applySharedDates,
  applySharedDestination,
  customizeInheritedField,
  relinkInheritedField,
  setCarReturnMode,
  swapFlightAirports,
  transitionDealsMode,
} from "./dealsSearchSynchronization";

const base = () => ({
  ...createDefaultDealsSearch(),
  mode: "hotel-flight-car" as const,
});
test("linked inherited fields follow shared destination and dates independently", () => {
  let search = applySharedDestination(base(), "Paris", "Paris (CDG)");
  assert.deepEqual(
    [search.hotelDestination, search.carPickupLocation],
    ["Paris", "Paris"],
  );
  search = customizeInheritedField(search, "stayDestination", "Versailles");
  search = applySharedDestination(search, "Rome", "Rome (FCO)");
  assert.equal(search.hotelDestination, "Versailles");
  assert.equal(search.carPickupLocation, "Rome");
  search = applySharedDates(search, { start: "2099-01-01", end: "2099-01-08" });
  search = customizeInheritedField(search, "carDates", {
    start: "2099-01-02",
    end: "2099-01-07",
  });
  search = applySharedDates(search, { start: "2099-02-01", end: "2099-02-08" });
  assert.deepEqual(
    [search.hotelCheckIn, search.hotelCheckOut],
    ["2099-02-01", "2099-02-08"],
  );
  assert.deepEqual(
    [search.carPickupDate, search.carReturnDate],
    ["2099-01-02", "2099-01-07"],
  );
});
test("reset actions use current shared values and restore future synchronization", () => {
  let search = customizeInheritedField(
    applySharedDestination(base(), "Paris"),
    "carPickup",
    "Lyon",
  );
  search = relinkInheritedField(search, "carPickup");
  search = applySharedDestination(search, "Berlin");
  assert.equal(search.carPickupLocation, "Berlin");
  assert.equal(search.carPickupLinked, true);
});
test("hotel and car become visible primary shared editors when Flight is removed", () => {
  let search = applySharedDestination(base(), "Lisbon", "Lisbon (LIS)");
  search = applySharedDates(search, { start: "2099-03-01", end: "2099-03-09" });
  search = customizeInheritedField(search, "stayDestination", "Sintra");
  search = customizeInheritedField(search, "stayDates", {
    start: "2099-03-02",
    end: "2099-03-08",
  });
  search = transitionDealsMode(search, "hotel-car");
  assert.deepEqual(
    [
      search.sharedDestination,
      search.sharedTravelStartDate,
      search.sharedTravelEndDate,
    ],
    ["Sintra", "2099-03-02", "2099-03-08"],
  );
  assert.deepEqual(
    [search.carPickupLocation, search.carPickupDate, search.carReturnDate],
    ["Sintra", "2099-03-02", "2099-03-08"],
  );
  search = applySharedDestination(search, "Porto");
  assert.equal(search.hotelDestination, "Porto");
  assert.equal(search.carPickupLocation, "Porto");
});
test("one-way flight keeps the shared end date for Stay and Car", () => {
  let search: DealsSearch = { ...base(), flightTripType: "one-way" };
  search = applySharedDates(search, { start: "2099-04-01", end: "2099-04-10" });
  assert.equal(search.flightReturnDate, "");
  assert.equal(search.hotelCheckOut, "2099-04-10");
  assert.equal(search.carReturnDate, "2099-04-10");
});
test("link flags and custom return mode round trip while old URLs infer safely", () => {
  const search = {
    ...base(),
    stayDestinationLinked: false,
    hotelDestination: "Potsdam",
    carReturnToDifferentLocation: true,
    carReturnLocation: "Hamburg",
  };
  assert.deepEqual(
    parseDealsSearchParams(serializeDealsSearchParams(search)),
    search,
  );
  const old = parseDealsSearchParams(
    new URLSearchParams("flightDestinationText=Paris&hotelDestination=Lyon"),
  );
  assert.equal(old.stayDestinationLinked, false);
  assert.equal(old.carPickupLinked, true);
});

test("airport swap updates linked destinations and preserves detached values", () => {
  let search = applySharedDestination(
    {
      ...base(),
      flightOriginText: "New York (JFK)",
      flightOriginCode: "JFK",
      flightDestinationCode: "LAX",
    },
    "Los Angeles",
    "Los Angeles (LAX)",
  );
  search = swapFlightAirports(search, "New York");
  assert.deepEqual(
    [
      search.flightOriginCode,
      search.flightDestinationCode,
      search.sharedDestination,
      search.hotelDestination,
      search.carPickupLocation,
    ],
    ["LAX", "JFK", "New York", "New York", "New York"],
  );
  search = customizeInheritedField(
    customizeInheritedField(search, "stayDestination", "Brooklyn"),
    "carPickup",
    "Queens",
  );
  search = swapFlightAirports(search, "Los Angeles");
  assert.deepEqual(
    [search.hotelDestination, search.carPickupLocation],
    ["Brooklyn", "Queens"],
  );
});
test("car return mode has one explicit transition", () => {
  let search = setCarReturnMode(base(), true, "Orly");
  assert.deepEqual(
    [search.carReturnToDifferentLocation, search.carReturnLocation],
    [true, "Orly"],
  );
  search = setCarReturnMode(search, false);
  assert.deepEqual(
    [search.carReturnToDifferentLocation, search.carReturnLocation],
    [false, ""],
  );
  search = setCarReturnMode(search, true, "   ");
  assert.deepEqual(
    [search.carReturnToDifferentLocation, search.carReturnLocation],
    [false, ""],
  );
});

test("removing and re-adding Flight preserves detached Stay and Car values", () => {
  let search = customizeInheritedField(base(), "stayDestination", "Versailles");
  search = customizeInheritedField(search, "carPickup", "Orly");
  search = customizeInheritedField(search, "carDates", {
    start: "2099-05-02",
    end: "2099-05-04",
  });
  search = {
    ...search,
    hotelCheckIn: "2099-05-01",
    hotelCheckOut: "2099-05-05",
  };
  search = transitionDealsMode(search, "hotel-car");
  search = transitionDealsMode(search, "hotel-flight-car");
  assert.deepEqual(
    [
      search.flightDestinationText,
      search.flightDepartureDate,
      search.flightReturnDate,
      search.hotelDestination,
      search.carPickupLocation,
      search.carPickupDate,
      search.carReturnDate,
    ],
    [
      "Versailles",
      "2099-05-01",
      "2099-05-05",
      "Versailles",
      "Orly",
      "2099-05-02",
      "2099-05-04",
    ],
  );
});
