import test from "node:test";
import assert from "node:assert/strict";
import type { PublicFlightResult } from "@/lib/types";
import {
  replaceDealsFlightSelection,
  type DealsTripPlanFlight,
  type DealsTripPlanHotel,
  type DealsTripPlanCar,
} from "./dealsTripPlan";
import { createDefaultDealsSearch } from "./dealsSearchParams";
import { getNextDealsJourneyStage } from "./dealsJourneyRoutes";
import {
  areDealsFlightSelectionsMateriallyEqual,
  buildDealsFlightDetailsSelection,
  buildDealsFlightInternalDetailsPath,
  buildGuidedDealsBaseTripPlan,
  getEffectiveDealsFlightDetailsId,
  isCurrentDealsFlightDetailsResponse,
} from "./dealsFlightDetails";

const search = () => {
  const s = createDefaultDealsSearch();
  s.mode = "flight-car";
  s.flightTripType = "round-trip";
  s.flightOriginCode = " los ";
  s.flightDestinationCode = " jfk ";
  s.flightDepartureDate = "2026-10-01";
  s.flightReturnDate = "2026-10-08";
  s.flightAdults = 2;
  s.flightChildren = 1;
  s.flightInfants = 1;
  s.flightCabinClass = "business";
  s.carPickupLocation = "JFK";
  s.carReturnLocation = "JFK";
  return s;
};
const flight = (
  patch: Partial<PublicFlightResult> = {},
): PublicFlightResult => ({
  id: "f1",
  provider: " Duffel ",
  airlineName: " Air Test ",
  airlineLogo: "",
  flightNumber: " AT123 ",
  originAirport: " LOS ",
  destinationAirport: " JFK ",
  departureTime: " 10:00 ",
  arrivalTime: " 18:00 ",
  duration: " 8h ",
  durationMinutes: 480,
  stops: 0,
  layovers: [],
  cabinClass: "business",
  baggageInfo: "Included",
  refundInfo: "Provider rules",
  price: 1234.56,
  currency: " USD ",
  bookingUrl: "https://provider.test",
  partnerRedirectUrl: "https://provider.test/r",
  valueScore: 1,
  riskScore: 1,
  comfortScore: 1,
  travelConfidenceScore: 1,
  travelEffortScore: 1,
  recommendationReasons: [],
  badges: [],
  ...patch,
});
const hotel: DealsTripPlanHotel = {
  id: "h",
  provider: "p",
  name: "Hotel",
  location: "NYC",
  checkIn: "2026-10-01",
  checkOut: "2026-10-08",
  sourcePrice: 1,
  sourceCurrency: "USD",
  resultReceivedAt: 1,
  detailsPath:
    "/hotels/details/h?destination=NYC&checkIn=2026-10-01&checkOut=2026-10-08&guests=1&rooms=1",
};
const car: DealsTripPlanCar = {
  id: "c",
  provider: "p",
  rentalCompany: "Car",
  modelName: "M",
  categoryLabel: "Economy",
  pickupLocation: "JFK",
  returnLocation: "JFK",
  pickupDate: "2026-10-01",
  pickupTime: "10:00",
  dropoffDate: "2026-10-08",
  dropoffTime: "10:00",
  sourcePrice: 1,
  sourceCurrency: "USD",
  resultReceivedAt: 1,
  detailsPath:
    "/cars/details/c?pickupLocation=JFK&dropoffLocation=JFK&pickupDate=2026-10-01&pickupTime=10%3A00&dropoffDate=2026-10-08&dropoffTime=10%3A00&driverAge=30",
};

test("effective id priority and response validation", () => {
  assert.equal(
    getEffectiveDealsFlightDetailsId(" transient ", { id: "confirmed" }),
    "transient",
  );
  assert.equal(
    getEffectiveDealsFlightDetailsId(null, { id: " confirmed " }),
    "confirmed",
  );
  assert.equal(
    getEffectiveDealsFlightDetailsId("\n", { id: "confirmed" }),
    "confirmed",
  );
  assert.equal(getEffectiveDealsFlightDetailsId(null, null), null);
  assert.equal(isCurrentDealsFlightDetailsResponse(" f1 ", flight()), true);
  assert.equal(isCurrentDealsFlightDetailsResponse("f2", flight()), false);
  assert.equal(isCurrentDealsFlightDetailsResponse("\n", flight()), false);
});

test("selection maps fields and validates source details", () => {
  const selection = buildDealsFlightDetailsSelection({
    flight: flight(),
    requestedFlightId: " f1 ",
    search: search(),
    resultReceivedAt: 99,
  });
  assert.ok(selection);
  assert.equal(selection.id, "f1");
  assert.equal(selection.provider, "Duffel");
  assert.equal(selection.airline, "Air Test");
  assert.equal(selection.flightNumber, "AT123");
  assert.equal(selection.origin, "LOS");
  assert.equal(selection.destination, "JFK");
  assert.equal(selection.departure, "10:00");
  assert.equal(selection.arrival, "18:00");
  assert.equal(selection.duration, "8h");
  assert.equal(selection.sourcePrice, 1234.56);
  assert.equal(selection.sourceCurrency, "USD");
  assert.equal(selection.resultReceivedAt, 99);
  assert.match(selection.detailsPath ?? "", /^\/flights\/details\/f1\?/);
  assert.equal(
    buildDealsFlightDetailsSelection({
      flight: flight({ id: "other" }),
      requestedFlightId: "f1",
      search: search(),
      resultReceivedAt: 99,
    }),
    null,
  );
  assert.equal(
    buildDealsFlightDetailsSelection({
      flight: flight({ price: 0 }),
      requestedFlightId: "f1",
      search: search(),
      resultReceivedAt: 99,
    }),
    null,
  );
  assert.equal(
    buildDealsFlightDetailsSelection({
      flight: flight({ currency: " " }),
      requestedFlightId: "f1",
      search: search(),
      resultReceivedAt: 99,
    }),
    null,
  );
  assert.equal(
    buildDealsFlightDetailsSelection({
      flight: flight({ originAirport: " " }),
      requestedFlightId: "f1",
      search: search(),
      resultReceivedAt: 99,
    }),
    null,
  );
  assert.equal(
    buildDealsFlightDetailsSelection({
      flight: flight(),
      requestedFlightId: "f1",
      search: search(),
      resultReceivedAt: -1,
    }),
    null,
  );
});

test("internal details path is canonical standalone flight search", () => {
  const path = buildDealsFlightInternalDetailsPath(search(), "f/✓");
  assert.ok(path);
  const url = new URL(path, "https://example.test");
  assert.equal(url.pathname, "/flights/details/f%2F%E2%9C%93");
  assert.equal(url.searchParams.get("returnDate"), "2026-10-08");
  assert.equal(url.searchParams.get("adults"), "2");
  assert.equal(url.searchParams.get("children"), "1");
  assert.equal(url.searchParams.get("infants"), "1");
  assert.equal(url.searchParams.get("travelers"), "4");
  assert.equal(url.searchParams.get("cabinClass"), "business");
  assert.equal(url.searchParams.has("flightId"), false);
  const oneWay = search();
  oneWay.flightTripType = "one-way";
  assert.equal(
    new URL(
      buildDealsFlightInternalDetailsPath(oneWay, "f1")!,
      "https://x",
    ).searchParams.has("returnDate"),
    false,
  );
  assert.equal(buildDealsFlightInternalDetailsPath(search(), "\n"), null);
});

test("material equality ignores receivedAt and detects material changes", () => {
  const a = buildDealsFlightDetailsSelection({
    flight: flight(),
    requestedFlightId: "f1",
    search: search(),
    resultReceivedAt: 1,
  })!;
  const b: DealsTripPlanFlight = { ...a, resultReceivedAt: 2 };
  assert.equal(areDealsFlightSelectionsMateriallyEqual(a, b), true);
  assert.equal(
    areDealsFlightSelectionsMateriallyEqual(a, { ...a, sourcePrice: 2 }),
    false,
  );
  assert.equal(
    areDealsFlightSelectionsMateriallyEqual(a, { ...a, sourceCurrency: "EUR" }),
    false,
  );
  assert.equal(
    areDealsFlightSelectionsMateriallyEqual(a, { ...a, arrival: "19:00" }),
    false,
  );
  assert.equal(
    areDealsFlightSelectionsMateriallyEqual(a, {
      ...a,
      detailsPath: "/flights/details/x",
    }),
    false,
  );
});

test("replace selection preserves hotel and clears dependent car/opened timestamps", () => {
  const s = buildDealsFlightDetailsSelection({
    flight: flight(),
    requestedFlightId: "f1",
    search: search(),
    resultReceivedAt: 1,
  })!;
  const base = buildGuidedDealsBaseTripPlan({
    search: search(),
    fingerprint: "fp",
    now: 10,
  })!;
  const withAll = {
    ...base,
    hotel,
    flight: s,
    car,
    opened: { hotel: 11, flight: 12, car: 13 },
  };
  const next = replaceDealsFlightSelection(withAll, { ...s, id: "f2" }, 20);
  assert.equal(next.hotel, hotel);
  assert.equal(next.car, undefined);
  assert.equal(next.opened.hotel, 11);
  assert.equal(next.opened.flight, undefined);
  assert.equal(next.opened.car, undefined);
});

test("base plans and next stages are canonical", () => {
  const base = buildGuidedDealsBaseTripPlan({
    search: search(),
    fingerprint: "fp",
    now: 10,
  });
  assert.ok(base);
  assert.match(base.resultsPath, /^\/packages\/results\?/);
  assert.notEqual(base.resultsPath, "/packages/results");
  assert.match(base.carsResultsPath ?? "", /^\/cars\/results\?/);
  assert.notEqual(base.carsResultsPath, "/cars/results");
  assert.equal(
    buildGuidedDealsBaseTripPlan({
      search: search(),
      fingerprint: " ",
      now: 10,
    }),
    null,
  );
  assert.equal(
    getNextDealsJourneyStage("flight-details", "hotel-flight"),
    null,
  );
  assert.equal(getNextDealsJourneyStage("flight-details", "flight-car"), null);
  assert.equal(
    getNextDealsJourneyStage("flight-details", "hotel-flight-car"),
    null,
  );
});
