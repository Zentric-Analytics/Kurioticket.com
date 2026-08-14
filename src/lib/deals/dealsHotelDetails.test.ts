import assert from "node:assert/strict";
import test from "node:test";
import type { PublicHotelResult } from "@/lib/types";
import type { HotelRoomOption } from "@/lib/hotels/hotelRoomOptions";
import { createDefaultDealsSearch } from "./dealsSearchParams";
import {
  createDealsTripPlan,
  replaceDealsHotelSelection,
  type DealsTripPlanCar,
  type DealsTripPlanFlight,
  type DealsTripPlanHotel,
} from "./dealsTripPlan";
import {
  areDealsHotelSelectionsMateriallyEqual,
  buildDealsHotelDetailsApiParams,
  buildDealsHotelDetailsRequestContext,
  buildDealsHotelDetailsSelection,
  buildDealsHotelInternalDetailsPath,
  getEffectiveDealsHotelDetailsId,
  isCurrentDealsHotelDetailsResponse,
} from "./dealsHotelDetails";

const search = () => {
  const s = createDefaultDealsSearch();
  s.mode = "hotel-flight-car";
  s.hotelDestination = "Paris";
  s.hotelCheckIn = "2026-09-01";
  s.hotelCheckOut = "2026-09-03";
  s.hotelAdults = 2;
  s.hotelChildren = 1;
  s.hotelRooms = 1;
  return s;
};
const hotel = (overrides: Partial<PublicHotelResult> = {}): PublicHotelResult =>
  ({
    id: "h1",
    provider: "Provider",
    name: "Real Hotel",
    rating: 4,
    location: "Paris",
    neighbourhood: "Opera",
    distanceFromCenter: "1 km",
    pricePerNight: 100,
    totalPrice: 200,
    currency: "EUR",
    amenities: ["Wifi"],
    roomType: "Deluxe room",
    cancellationInfo: "Free cancellation",
    valueScore: 80,
    travelConfidenceScore: 80,
    arrivalSuitabilityScore: 80,
    recommendationReasons: [],
    badges: [],
    bookingUrl: "https://example.test",
    partnerRedirectUrl: "https://example.test/r",
    ...overrides,
  }) as PublicHotelResult;
const selected = (
  overrides: Partial<DealsTripPlanHotel> = {},
): DealsTripPlanHotel => ({
  id: "h1",
  provider: "Provider",
  name: "Real Hotel",
  location: "Opera",
  checkIn: "2026-09-01",
  checkOut: "2026-09-03",
  roomOptionId: "h1-deluxe",
  roomType: "Deluxe room",
  bedConfiguration: "King bed",
  mealPlan: "Breakfast",
  sourcePrice: 450,
  sourceCurrency: "GBP",
  resultReceivedAt: 100,
  detailsPath:
    "/hotels/details/h1?destination=Paris&checkIn=2026-09-01&checkOut=2026-09-03&guests=3&rooms=1",
  ...overrides,
});
const room = (overrides: Partial<HotelRoomOption> = {}): HotelRoomOption => ({
  id: "h1-deluxe",
  hotelId: "h1",
  name: "Deluxe room",
  bedConfiguration: "King bed",
  features: ["Desk"],
  mealPlan: "Breakfast",
  cancellationInfo: "Planning terms",
  pricePerNight: 225,
  totalPrice: 450,
  currency: "GBP",
  pricingKind: "indicative",
  availabilityKind: "planning",
  ...overrides,
});

test("effective hotel ID prefers transient, falls back to confirmed, and handles missing", () => {
  assert.equal(getEffectiveDealsHotelDetailsId(" h2 ", selected()), "h2");
  assert.equal(getEffectiveDealsHotelDetailsId(null, selected()), "h1");
  assert.equal(getEffectiveDealsHotelDetailsId(null, null), null);
});
test("guided API params exactly map id, dates, guests and rooms without destination", () => {
  const ctx = buildDealsHotelDetailsRequestContext(search(), "h1");
  const params = buildDealsHotelDetailsApiParams(ctx);
  assert.deepEqual(
    [...params.keys()],
    ["id", "checkIn", "checkOut", "guests", "rooms"],
  );
  assert.equal(params.get("guests"), "3");
  assert.equal(params.has("destination"), false);
});
test("hotel response IDs must match requested effective ID", () => {
  assert.equal(isCurrentDealsHotelDetailsResponse("h1", hotel()), true);
  assert.equal(isCurrentDealsHotelDetailsResponse("h2", hotel()), false);
});
test("internal details path uses only approved context keys and validates", () => {
  const path = buildDealsHotelInternalDetailsPath(search(), "h1")!;
  assert.equal(
    path,
    "/hotels/details/h1?destination=Paris&checkIn=2026-09-01&checkOut=2026-09-03&guests=3&rooms=1",
  );
  assert.deepEqual(
    [...new URL(path, "https://x.test").searchParams.keys()],
    ["destination", "checkIn", "checkOut", "guests", "rooms"],
  );
});
test("selection requires a valid room belonging to the requested hotel", () => {
  const s = search();
  assert.equal(
    buildDealsHotelDetailsSelection({
      hotel: hotel(),
      roomOption: null,
      requestedHotelId: "h1",
      search: s,
      resultReceivedAt: 1,
    }),
    null,
  );
  assert.equal(
    buildDealsHotelDetailsSelection({
      hotel: hotel(),
      roomOption: room({ hotelId: "h2" }),
      requestedHotelId: "h1",
      search: s,
      resultReceivedAt: 1,
    }),
    null,
  );
  assert.equal(
    buildDealsHotelDetailsSelection({
      hotel: hotel(),
      roomOption: room({ id: "" }),
      requestedHotelId: "h1",
      search: s,
      resultReceivedAt: 1,
    }),
    null,
  );
  assert.equal(
    buildDealsHotelDetailsSelection({
      hotel: hotel(),
      roomOption: room({ totalPrice: 0 }),
      requestedHotelId: "h1",
      search: s,
      resultReceivedAt: 1,
    }),
    null,
  );
});
test("selected room is authoritative for identity, price, currency and display metadata", () => {
  const selection = buildDealsHotelDetailsSelection({
    hotel: hotel({ totalPrice: 200, currency: "EUR" }),
    roomOption: room(),
    requestedHotelId: "h1",
    search: search(),
    resultReceivedAt: 123,
  });
  assert.deepEqual(selection, selected({ resultReceivedAt: 123 }));
});
test("material equality ignores timestamp but detects room identity and price changes", () => {
  assert.equal(
    areDealsHotelSelectionsMateriallyEqual(
      selected({ resultReceivedAt: 1 }),
      selected({ resultReceivedAt: 2 }),
    ),
    true,
  );
  assert.equal(
    areDealsHotelSelectionsMateriallyEqual(
      selected(),
      selected({ sourcePrice: 451 }),
    ),
    false,
  );
  assert.equal(
    areDealsHotelSelectionsMateriallyEqual(
      selected(),
      selected({ roomOptionId: "h1-suite", roomType: "Suite" }),
    ),
    false,
  );
});
test("replace behavior preserves dependencies for identical selections and clears them for changed hotel", () => {
  const flight: DealsTripPlanFlight = {
    id: "f",
    provider: "P",
    airline: "Air",
    origin: "A",
    destination: "B",
    departure: "2026-09-01T00:00:00Z",
    arrival: "2026-09-01T02:00:00Z",
    duration: "2h",
    sourcePrice: 50,
    sourceCurrency: "EUR",
    resultReceivedAt: 1,
  };
  const car: DealsTripPlanCar = {
    id: "c",
    provider: "P",
    rentalCompany: "R",
    modelName: "M",
    categoryLabel: "Compact",
    pickupLocation: "Paris",
    returnLocation: "Paris",
    pickupDate: "2026-09-01",
    pickupTime: "10:00",
    dropoffDate: "2026-09-03",
    dropoffTime: "10:00",
    sourcePrice: 40,
    sourceCurrency: "EUR",
    resultReceivedAt: 1,
    detailsPath:
      "/cars/details/c?pickupLocation=Paris&dropoffLocation=Paris&pickupDate=2026-09-01&pickupTime=10%3A00&dropoffDate=2026-09-03&dropoffTime=10%3A00&driverAge=30",
  };
  const plan = {
    ...createDealsTripPlan(
      {
        mode: "hotel-flight-car",
        searchFingerprint: "fp",
        resultsPath: "/deals/results",
      },
      1,
    ),
    hotel: selected(),
    flight,
    car,
    opened: { hotel: 2, flight: 3, car: 4 },
  };
  assert.equal(
    areDealsHotelSelectionsMateriallyEqual(
      plan.hotel,
      selected({ resultReceivedAt: 999 }),
    ),
    true,
  );
  const changed = replaceDealsHotelSelection(
    plan,
    selected({
      id: "h2",
      detailsPath:
        "/hotels/details/h2?destination=Paris&checkIn=2026-09-01&checkOut=2026-09-03&guests=3&rooms=1",
    }),
    5,
  );
  assert.equal(changed.flight, undefined);
  assert.equal(changed.car, undefined);
  assert.deepEqual(changed.opened, {});
});

test("hotel details helpers cannot create a context-invalid base Trip Plan", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./dealsHotelDetails.ts", import.meta.url), "utf8"),
  );
  assert.doesNotMatch(source, /applyDealsHotelDetailsConfirmation/);
  assert.doesNotMatch(source, /searchFingerprint:\s*""/);
  assert.doesNotMatch(source, /createDealsTripPlan/);
});
