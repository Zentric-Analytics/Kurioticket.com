import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCarApiPayload,
  buildCarResultsUrl,
  buildDealsModifyUrl,
  buildDealsResultsUrl,
  buildFlightApiPayload,
  buildFlightResultsUrl,
  buildHotelApiPayload,
  buildHotelResultsUrl,
  createDefaultDealsSearch,
  getDealsPackageModeForProducts,
  getDealsSummaries,
  getIncludedProductList,
  getIncludedProducts,
  parseDealsSearchParams,
  serializeDealsSearchParams,
  tryToggleDealsProduct,
  validateCarSearch,
  validateDealsSearch,
  validateFlightSearch,
  validateHotelSearch,
  type DealsSearch,
} from "./dealsSearchParams";

const valid = (): DealsSearch => ({
  ...createDefaultDealsSearch(),
  mode: "hotel-flight-car",
  flightOriginText: "New York (JFK)",
  flightOriginCode: "JFK",
  flightDestinationText: "Los Angeles (LAX)",
  flightDestinationCode: "LAX",
  sharedDestination: "Los Angeles",
  sharedTravelStartDate: "2099-02-01",
  sharedTravelEndDate: "2099-02-10",
  flightDepartureDate: "2099-02-01",
  flightReturnDate: "2099-02-10",
  hotelDestination: "Los Angeles",
  hotelCheckIn: "2099-02-03",
  hotelCheckOut: "2099-02-07",
  stayDatesLinked: false,
  carPickupLocation: "Los Angeles",
  carPickupDate: "2099-02-04",
  carReturnDate: "2099-02-06",
  carDatesLinked: false,
});
test("fresh defaults leave every product date empty and show placeholders", () => {
  const search = createDefaultDealsSearch();
  assert.equal(search.flightTripType, "round-trip");
  assert.deepEqual(
    [
      search.flightDepartureDate,
      search.flightReturnDate,
      search.hotelCheckIn,
      search.hotelCheckOut,
      search.carPickupDate,
      search.carReturnDate,
    ],
    ["", "", "", "", "", ""],
  );
  assert.deepEqual(getDealsSummaries(search), {
    flight: "Travel dates",
    hotel: "Check-in — Check-out",
    car: "Pickup date — Return date",
  });
});
test("package inclusion matrix", () => {
  assert.deepEqual(getIncludedProducts("hotel-flight"), {
    flight: true,
    hotel: true,
    car: false,
  });
  assert.deepEqual(getIncludedProducts("hotel-flight-car"), {
    flight: true,
    hotel: true,
    car: true,
  });
  assert.deepEqual(getIncludedProducts("flight-car"), {
    flight: true,
    hotel: false,
    car: true,
  });
  assert.deepEqual(getIncludedProducts("hotel-car"), {
    flight: false,
    hotel: true,
    car: true,
  });
});
test("product sets resolve canonical modes regardless of order or duplicates", () => {
  assert.equal(
    getDealsPackageModeForProducts(["hotel", "flight"]),
    "hotel-flight",
  );
  assert.equal(getDealsPackageModeForProducts(["car", "flight"]), "flight-car");
  assert.equal(getDealsPackageModeForProducts(["car", "hotel"]), "hotel-car");
  assert.equal(
    getDealsPackageModeForProducts(["car", "hotel", "flight"]),
    "hotel-flight-car",
  );
  assert.equal(
    getDealsPackageModeForProducts(["flight", "hotel", "hotel"]),
    "hotel-flight",
  );
  assert.equal(getDealsPackageModeForProducts(["hotel"]), null);
  assert.equal(getDealsPackageModeForProducts([]), null);
});
test("included product lists use workflow order", () => {
  assert.deepEqual(getIncludedProductList("hotel-flight-car"), [
    "hotel",
    "flight",
    "car",
  ]);
  assert.deepEqual(getIncludedProductList("flight-car"), ["flight", "car"]);
});
test("product toggling adds, removes, and safely blocks below two", () => {
  assert.deepEqual(tryToggleDealsProduct("hotel-flight", "car"), {
    changed: true,
    mode: "hotel-flight-car",
  });
  assert.deepEqual(tryToggleDealsProduct("hotel-flight-car", "hotel"), {
    changed: true,
    mode: "flight-car",
  });
  assert.deepEqual(tryToggleDealsProduct("hotel-flight-car", "flight"), {
    changed: true,
    mode: "hotel-car",
  });
  assert.deepEqual(tryToggleDealsProduct("hotel-flight-car", "car"), {
    changed: true,
    mode: "hotel-flight",
  });
  assert.deepEqual(tryToggleDealsProduct("hotel-flight", "flight"), {
    changed: false,
    mode: "hotel-flight",
    reason: "minimum-products",
  });
});
test("complete query round trips and builds deals links", () => {
  const search = valid();
  const parsed = parseDealsSearchParams(serializeDealsSearchParams(search));
  assert.deepEqual(parsed, search);
  assert.match(buildDealsResultsUrl(search), /^\/deals\/results\?/);
  assert.match(buildDealsModifyUrl(search), /^\/deals\?/);
});
test("missing and malformed dates normalize to empty", () => {
  const parsed = parseDealsSearchParams(
    new URLSearchParams(
      "flightAdults=1.5&hotelRooms=nope&flightOriginCode=jfk&flightDepartureDate=2026-99-99&hotelCheckOut=not-a-date&carPickupDate=2026-02-30",
    ),
  );
  assert.equal(parsed.flightAdults, 2);
  assert.equal(parsed.hotelRooms, 1);
  assert.equal(parsed.flightOriginCode, "JFK");
  assert.deepEqual(
    [
      parsed.flightDepartureDate,
      parsed.flightReturnDate,
      parsed.hotelCheckIn,
      parsed.hotelCheckOut,
      parsed.carPickupDate,
      parsed.carReturnDate,
    ],
    ["", "", "", "", "", ""],
  );
});
test("valid Modify Search dates are preserved", () => {
  const dates =
    "flightDepartureDate=2099-01-02&flightReturnDate=2099-01-09&hotelCheckIn=2099-02-03&hotelCheckOut=2099-02-08&carPickupDate=2099-03-04&carReturnDate=2099-03-10";
  const parsed = parseDealsSearchParams(new URLSearchParams(dates));
  assert.deepEqual(
    [
      parsed.flightDepartureDate,
      parsed.flightReturnDate,
      parsed.hotelCheckIn,
      parsed.hotelCheckOut,
      parsed.carPickupDate,
      parsed.carReturnDate,
    ],
    [
      "2099-01-02",
      "2099-01-09",
      "2099-02-03",
      "2099-02-08",
      "2099-03-04",
      "2099-03-10",
    ],
  );
});
test("one-way clears its return while round-trip leaves a missing return empty", () => {
  const oneWay = parseDealsSearchParams(
    new URLSearchParams(
      "flightTripType=one-way&flightDepartureDate=2099-01-02&flightReturnDate=2099-01-09",
    ),
  );
  assert.equal(oneWay.flightTripType, "one-way");
  assert.equal(oneWay.flightReturnDate, "");
  const roundTrip = parseDealsSearchParams(
    new URLSearchParams("flightDepartureDate=2099-01-02"),
  );
  assert.equal(roundTrip.flightTripType, "round-trip");
  assert.equal(roundTrip.flightReturnDate, "");
});
test("included products reject defaults until required dates are selected", () => {
  const errors = validateDealsSearch(createDefaultDealsSearch(), "2000-01-01");
  assert.ok(errors.flight?.flightDepartureDate);
  assert.ok(errors.flight?.flightReturnDate);
  assert.ok(errors.hotel?.hotelDates);
});
test("flight validates codes, passenger limits, infants, fractions, and dates", () => {
  const search = valid();
  assert.deepEqual(validateFlightSearch(search, "2000-01-01"), {});
  search.flightDestinationCode = "los angeles";
  assert.ok(validateFlightSearch(search, "2000-01-01").flightDestinationCode);
  assert.equal(buildFlightApiPayload(search).destination, "");
  search.flightDestinationCode = "lax";
  search.flightAdults = 7;
  search.flightChildren = 1;
  search.flightInfants = 1;
  assert.deepEqual(validateFlightSearch(search, "2000-01-01"), {});
  search.flightChildren = 2;
  assert.ok(validateFlightSearch(search, "2000-01-01").flightPassengers);
  search.flightChildren = 0;
  search.flightAdults = 1;
  search.flightInfants = 2;
  assert.ok(validateFlightSearch(search, "2000-01-01").flightInfants);
  search.flightInfants = 0;
  search.flightAdults = 1.5;
  assert.ok(validateFlightSearch(search, "2000-01-01").flightPassengers);
  search.flightAdults = 1;
  search.flightReturnDate = "2001-01-01";
  search.flightDepartureDate = "2001-01-02";
  assert.ok(validateFlightSearch(search, "2000-01-01").flightReturnDate);
});
test("hotel validates destination, dates, guest and room maximums", () => {
  const search = valid();
  assert.deepEqual(validateHotelSearch(search, "2000-01-01"), {});
  search.hotelDestination = "";
  assert.ok(validateHotelSearch(search, "2000-01-01").hotelDestination);
  search.hotelDestination = "LA";
  search.hotelCheckOut = search.hotelCheckIn;
  assert.ok(validateHotelSearch(search, "2000-01-01").hotelDates);
  search.hotelCheckOut = "2099-01-02";
  search.hotelCheckIn = "2099-01-01";
  search.hotelAdults = 12;
  search.hotelChildren = 0;
  assert.equal(
    validateHotelSearch(search, "2000-01-01").hotelGuests,
    undefined,
  );
  search.hotelChildren = 1;
  assert.ok(validateHotelSearch(search, "2000-01-01").hotelGuests);
  search.hotelChildren = 0;
  search.hotelRooms = 7;
  assert.ok(validateHotelSearch(search, "2000-01-01").hotelRooms);
});
test("hotel API payload normalizes only the destination search value", () => {
  for (const [decorated, canonical] of [
    ["London, United Kingdom", "London"],
    ["Paris, France", "Paris"],
    ["New York, NY", "New York"],
    ["Tokyo, Japan", "Tokyo"],
  ]) {
    const search = {
      ...valid(),
      hotelDestination: decorated,
      hotelAdults: 2,
      hotelChildren: 1,
      hotelRooms: 2,
    };
    const flightBefore = buildFlightApiPayload(search),
      carBefore = buildCarApiPayload(search);
    assert.deepEqual(buildHotelApiPayload(search), {
      destination: canonical,
      checkIn: "2099-02-03",
      checkOut: "2099-02-07",
      guests: 3,
      rooms: 2,
    });
    assert.equal(search.hotelDestination, decorated);
    assert.deepEqual(buildFlightApiPayload(search), flightBefore);
    assert.deepEqual(buildCarApiPayload(search), carBefore);
  }
});
test("hidden products do not affect validation", () => {
  const search = valid();
  search.mode = "flight-car";
  search.hotelDestination = "";
  assert.equal(validateDealsSearch(search, "2000-01-01").hotel, undefined);
  search.mode = "hotel-flight";
  search.carPickupLocation = "";
  assert.equal(validateDealsSearch(search, "2000-01-01").car, undefined);
});
test("car reuses canonical validation and effective return location", () => {
  const search = valid();
  assert.deepEqual(validateCarSearch(search, "2000-01-01"), {});
  let url = new URL(buildCarResultsUrl(search), "https://example.test");
  assert.equal(url.searchParams.get("dropoffLocation"), "Los Angeles");
  search.carReturnToDifferentLocation = true;
  search.carReturnLocation = "";
  assert.ok(validateCarSearch(search, "2000-01-01").dropoffLocation);
  search.carReturnLocation = "San Diego";
  url = new URL(buildCarResultsUrl(search), "https://example.test");
  assert.equal(url.searchParams.get("dropoffLocation"), "San Diego");
  search.carReturnDate = "2000-01-01";
  assert.ok(validateCarSearch(search, "2000-01-01").dateRange);
});
test("product deep links preserve separate canonical values", () => {
  const search = valid();
  search.flightDepartureDate = "2099-02-01";
  search.flightReturnDate = "2099-02-10";
  search.hotelCheckIn = "2099-02-03";
  search.hotelCheckOut = "2099-02-07";
  search.carPickupDate = "2099-02-04";
  search.carReturnDate = "2099-02-06";
  const flight = new URL(buildFlightResultsUrl(search), "https://x");
  const hotel = new URL(buildHotelResultsUrl(search), "https://x");
  const car = new URL(buildCarResultsUrl(search), "https://x");
  assert.equal(flight.searchParams.get("destination"), "LAX");
  assert.notEqual(
    flight.searchParams.get("destination"),
    search.flightDestinationText,
  );
  assert.equal(hotel.searchParams.get("checkIn"), "2099-02-03");
  assert.equal(car.searchParams.get("pickupDate"), "2099-02-04");
  assert.equal(car.searchParams.get("pickupTime"), "10:00");
});

test("legacy one-way URLs migrate shared ends without provider returns", () => {
  const hotel = parseDealsSearchParams(
    new URLSearchParams(
      "mode=hotel-flight&flightTripType=one-way&flightDepartureDate=2099-01-02&hotelCheckIn=2099-01-02&hotelCheckOut=2099-01-09&stayDatesLinked=true",
    ),
  );
  assert.deepEqual(
    [
      hotel.sharedTravelStartDate,
      hotel.sharedTravelEndDate,
      hotel.flightReturnDate,
    ],
    ["2099-01-02", "2099-01-09", ""],
  );
  const car = parseDealsSearchParams(
    new URLSearchParams(
      "mode=flight-car&flightTripType=one-way&flightDepartureDate=2099-01-02&carPickupDate=2099-01-02&carReturnDate=2099-01-10&carDatesLinked=true",
    ),
  );
  assert.deepEqual(
    [car.sharedTravelStartDate, car.sharedTravelEndDate, car.flightReturnDate],
    ["2099-01-02", "2099-01-10", ""],
  );
});
test("legacy party precedence follows package mode", () => {
  const flight = parseDealsSearchParams(
    new URLSearchParams(
      "mode=hotel-flight&flightAdults=2&flightChildren=1&hotelAdults=8&hotelChildren=3",
    ),
  );
  assert.deepEqual(
    [
      flight.flightAdults,
      flight.hotelAdults,
      flight.flightChildren,
      flight.hotelChildren,
    ],
    [2, 2, 1, 1],
  );
  const hotelCar = parseDealsSearchParams(
    new URLSearchParams(
      "mode=hotel-car&flightAdults=2&flightChildren=1&hotelAdults=8&hotelChildren=3",
    ),
  );
  assert.deepEqual(
    [
      hotelCar.flightAdults,
      hotelCar.hotelAdults,
      hotelCar.flightChildren,
      hotelCar.hotelChildren,
    ],
    [8, 8, 3, 3],
  );
});

test("legacy linked provider fields hydrate from canonical Flight values", () => {
  for (const mode of ["hotel-flight", "flight-car", "hotel-flight-car"] as const) {
    const parsed = parseDealsSearchParams(
      new URLSearchParams({
        mode,
        flightDestinationText: "Paris",
        flightDepartureDate: "2099-06-01",
        flightReturnDate: "2099-06-08",
      }),
    );
    assert.equal(parsed.sharedDestination, "Paris");
    if (getIncludedProducts(mode).hotel)
      assert.deepEqual(
        [parsed.hotelDestination, parsed.hotelCheckIn, parsed.hotelCheckOut],
        ["Paris", "2099-06-01", "2099-06-08"],
      );
    if (getIncludedProducts(mode).car)
      assert.deepEqual(
        [parsed.carPickupLocation, parsed.carPickupDate, parsed.carReturnDate],
        ["Paris", "2099-06-01", "2099-06-08"],
      );
  }
});

test("explicit detached legacy fields survive hydration and blank custom returns normalize", () => {
  const parsed = parseDealsSearchParams(
    new URLSearchParams({
      mode: "hotel-flight-car",
      sharedDestination: "Paris",
      sharedTravelStartDate: "2099-07-01",
      sharedTravelEndDate: "2099-07-09",
      hotelDestination: "Lyon",
      hotelCheckIn: "2099-07-02",
      hotelCheckOut: "2099-07-08",
      carPickupLocation: "Orly",
      carPickupDate: "2099-07-03",
      carReturnDate: "2099-07-07",
      stayDestinationLinked: "false",
      stayDatesLinked: "false",
      carPickupLinked: "false",
      carDatesLinked: "false",
      carReturnToDifferentLocation: "true",
      carReturnLocation: "   ",
    }),
  );
  assert.deepEqual(
    [parsed.hotelDestination, parsed.hotelCheckIn, parsed.hotelCheckOut],
    ["Lyon", "2099-07-02", "2099-07-08"],
  );
  assert.deepEqual(
    [parsed.carPickupLocation, parsed.carPickupDate, parsed.carReturnDate],
    ["Orly", "2099-07-03", "2099-07-07"],
  );
  assert.deepEqual(
    [parsed.carReturnToDifferentLocation, parsed.carReturnLocation],
    [false, ""],
  );
});

test("canonical cars results URL preserves all guided car search facts", () => {
  const search = {
    ...valid(),
    carPickupLocation: "Los Angeles Union Station",
    carReturnToDifferentLocation: true,
    carReturnLocation: "LAX Airport",
    carPickupDate: "2099-02-04",
    carPickupTime: "09:30",
    carReturnDate: "2099-02-06",
    carReturnTime: "18:45",
    carDriverAge: "42",
  };
  const url = buildCarResultsUrl(search);
  assert.equal(
    url,
    "/cars/results?pickupLocation=Los+Angeles+Union+Station&dropoffLocation=LAX+Airport&pickupDate=2099-02-04&pickupTime=09%3A30&dropoffDate=2099-02-06&dropoffTime=18%3A45&driverAge=42",
  );
  const params = new URL(url, "https://example.test").searchParams;
  assert.equal(params.get("pickupLocation"), "Los Angeles Union Station");
  assert.equal(params.get("dropoffLocation"), "LAX Airport");
  assert.equal(params.get("pickupDate"), "2099-02-04");
  assert.equal(params.get("dropoffDate"), "2099-02-06");
  assert.equal(params.get("pickupTime"), "09:30");
  assert.equal(params.get("dropoffTime"), "18:45");
  assert.equal(params.get("driverAge"), "42");
});
