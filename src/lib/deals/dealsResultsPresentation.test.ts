import assert from "node:assert/strict";
import test from "node:test";
import { countHotelNights, dealsPreviewLimit, formatDealsOptionCount, getFlightLegLabelKey, getHotelPreviewPrice, getOverviewData, normalizeFlightLegs, normalizeMetadata, safeDateTime, selectDealsFlightPreviews, selectDealsHotelPreviews } from "./dealsResultsPresentation";
import { createDefaultDealsSearch } from "./dealsSearchParams";
import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";

const search = { ...createDefaultDealsSearch(), flightOriginCode: "LOS", flightDestinationCode: "LAX", flightDepartureDate: "2026-07-27", flightReturnDate: "2026-07-29", hotelDestination: "Los Angeles", hotelCheckIn: "2026-03-07", hotelCheckOut: "2026-03-09", carPickupLocation: "LAX", carReturnToDifferentLocation: true, carReturnLocation: "SFO" };
test("flight overview supports round trip and one way", () => { assert.match(getOverviewData(search, "en-US").flight.dates, /Jul 27.*Jul 29/); assert.doesNotMatch(getOverviewData({ ...search, flightTripType: "one-way" }, "en-US").flight.dates, /Jul 29/); });
test("night count is timezone independent around DST", () => { assert.equal(countHotelNights("2026-02-01", "2026-02-04"), 3); assert.equal(countHotelNights("2026-03-07", "2026-03-09"), 2); assert.equal(countHotelNights("bad", "2026-03-09"), null); });
test("car summary uses effective return location", () => assert.match(getOverviewData(search, "en-US").car.title, /LAX → SFO/));
const flight = { id: "f", provider: "p", airlineName: "Air", originAirport: "LOS", destinationAirport: "LAX", departureTime: "2026-07-27T10:00:00Z", arrivalTime: "2026-07-27T14:00:00Z", duration: "4h", stops: 0, price: 10, currency: "USD", legs: [] } as unknown as PublicFlightResult;
test("flight legs preserve provider directions and use outbound for the fallback", () => {
  assert.equal(normalizeFlightLegs(flight).at(0)?.direction, "outbound");
  const legs = normalizeFlightLegs({ ...flight, legs: [
    { ...flight, direction: "outbound" },
    { ...flight, direction: "return", originAirport: "LAX", destinationAirport: "LOS" },
    { ...flight, direction: "leg", originAirport: "LOS", destinationAirport: "ABV" },
  ] } as unknown as PublicFlightResult);
  assert.deepEqual(legs.map((leg) => leg.direction), ["outbound", "return", "leg"]);
});
test("flight leg labels follow direction rather than position", () => {
  assert.equal(getFlightLegLabelKey("outbound"), "deals.results.outbound");
  assert.equal(getFlightLegLabelKey("return"), "deals.results.return");
  assert.equal(getFlightLegLabelKey("leg"), "flightLeg");
  assert.notEqual(getFlightLegLabelKey("leg"), "deals.results.return");
});
test("provider-local timestamps retain their written date and time", () => {
  assert.deepEqual(safeDateTime("2026-07-12T23:30:00-10:00", "en-US"), { date: "Jul 12", time: "11:30 PM" });
  assert.deepEqual(safeDateTime("2026-07-13T00:30:00+10:00", "en-US"), { date: "Jul 13", time: "12:30 AM" });
  assert.deepEqual(safeDateTime("2026-07-12T09:30:00Z", "en-US"), { date: "Jul 12", time: "9:30 AM" });
  assert.deepEqual(safeDateTime("2026-07-12T23:30:00", "en-US"), { date: "Jul 12", time: "11:30 PM" });
});
test("invalid and empty timestamps return empty presentation values", () => {
  assert.deepEqual(safeDateTime("not-a-date", "en-US"), { date: "", time: "" });
  assert.deepEqual(safeDateTime("", "en-US"), { date: "", time: "" });
  assert.deepEqual(safeDateTime("2026-02-30T12:00:00Z", "en-US"), { date: "", time: "" });
});
test("stops preserve direct, singular, and plural inputs", () => { assert.equal(normalizeFlightLegs({ ...flight, stops: 0 }).at(0)?.stops, 0); assert.equal(normalizeFlightLegs({ ...flight, stops: 1 }).at(0)?.stops, 1); assert.equal(normalizeFlightLegs({ ...flight, stops: 2 }).at(0)?.stops, 2); });
test("hotel price distinguishes bookable and discovery", () => { const hotel = { totalPrice: 200, currency: "USD" } as PublicHotelResult; assert.deepEqual(getHotelPreviewPrice(hotel), { amount: 200, currency: "USD" }); assert.equal(getHotelPreviewPrice({ inventoryKind: "discovery" } as PublicHotelResult), null); });
test("preview contract and metadata normalization", () => { assert.equal(dealsPreviewLimit, 3); assert.deepEqual(normalizeMetadata({ warnings: ["safe", 2], servedFromFallback: "yes", latencyMs: Infinity, warningCategory: "secret" }), { warnings: ["safe"], servedFromFallback: false, latencyMs: undefined, warningCategory: undefined }); assert.deepEqual(normalizeMetadata({ warnings: null }).warnings, []); });

const makeFlight = (id: string, values: Partial<PublicFlightResult> = {}) => ({ ...flight, id, valueScore: 50, price: 500, durationMinutes: 300, ...values } as PublicFlightResult);
const makeHotel = (id: string, values: Record<string, unknown> = {}) => ({ id, provider: "provider", name: id, rating: 4, location: "City", amenities: [], roomType: "Room", cancellationInfo: "", valueScore: 50, travelConfidenceScore: 0, arrivalSuitabilityScore: 0, recommendationReasons: [], badges: [], totalPrice: 500, pricePerNight: 250, currency: "USD", bookingUrl: "#", partnerRedirectUrl: "#", ...values } as unknown as PublicHotelResult);

test("flight previews assign recommended, lowest-price, and shortest categories distinctly", () => {
  const previews = selectDealsFlightPreviews([makeFlight("recommended", { valueScore: 99 }), makeFlight("lowest", { price: 100 }), makeFlight("shortest", { durationMinutes: 60 })]);
  assert.deepEqual(previews.map(({ result, badgeKey }) => [result.id, badgeKey]), [["recommended", "deals.results.flight.recommended.badge"], ["lowest", "deals.results.flight.lowest.badge"], ["shortest", "deals.results.flight.shortest.badge"]]);
  assert.deepEqual(previews.map(({ reasonKey }) => reasonKey), [undefined, "deals.results.flight.lowest.reason", undefined]);
  assert.equal(new Set(previews.map(({ result }) => result.id)).size, 3);
});
test("flight selection skips duplicate winners, invalid values, and breaks ties deterministically", () => {
  const previews = selectDealsFlightPreviews([makeFlight("winner", { valueScore: 100, price: 90, durationMinutes: 50 }), makeFlight("b", { valueScore: Number.NaN, price: 100, durationMinutes: 80 }), makeFlight("a", { valueScore: 0, price: 100, durationMinutes: 80 }), makeFlight("invalid", { price: -1, durationMinutes: Number.NaN })]);
  assert.deepEqual(previews.map(({ result }) => result.id), ["winner", "b", "a"]);
  assert.deepEqual(previews.map(({ badgeKey }) => badgeKey), ["deals.results.flight.recommended.badge", "deals.results.preview.more.badge", "deals.results.preview.more.badge"]);
  assert.deepEqual(selectDealsFlightPreviews([]), []);
});
test("flight selection fills fewer qualifying results in stable input order without duplicates", () => {
  const previews = selectDealsFlightPreviews([makeFlight("first", { valueScore: 0, price: 0, durationMinutes: 0 }), makeFlight("second", { valueScore: Number.NaN, price: -1, durationMinutes: -1 })]);
  assert.deepEqual(previews.map(({ result }) => result.id), ["first", "second"]);
  assert.ok(previews.every(({ badgeKey, reasonKey }) => badgeKey === "deals.results.preview.more.badge" && reasonKey === undefined));
});
test("hotel previews assign recommended, lowest bookable total, and normalized guest-rating categories", () => {
  const previews = selectDealsHotelPreviews([makeHotel("recommended", { valueScore: 99 }), makeHotel("lowest", { totalPrice: 100 }), makeHotel("rated", { reviewScore: 4.8, reviewScale: 5, reviewCount: 20 })]);
  assert.deepEqual(previews.map(({ result, badgeKey }) => [result.id, badgeKey]), [["recommended", "deals.results.hotel.recommended.badge"], ["lowest", "deals.results.hotel.lowest.badge"], ["rated", "deals.results.hotel.rating.badge"]]);
  assert.deepEqual(previews.map(({ reasonKey }) => reasonKey), [undefined, undefined, "deals.results.hotel.rating.reason"]);
  assert.equal(new Set(previews.map(({ result }) => result.id)).size, 3);
});
test("hotel rating uses review count, price, and ID ties while missing ratings do not qualify", () => {
  const previews = selectDealsHotelPreviews([makeHotel("recommended", { valueScore: 90 }), makeHotel("lowest", { valueScore: 0, totalPrice: 100 }), makeHotel("b", { valueScore: 0, reviewScore: 9, reviewScale: 10, reviewCount: 20, totalPrice: 300 }), makeHotel("a", { valueScore: 0, reviewScore: 4.5, reviewScale: 5, reviewCount: 20, totalPrice: 300 }), makeHotel("missing", { valueScore: 0, reviewScore: undefined })]);
  assert.equal(previews[2]?.result.id, "a");
});
test("hotel discovery and invalid prices never qualify for lowest total", () => {
  const previews = selectDealsHotelPreviews([makeHotel("recommended", { valueScore: 99 }), makeHotel("discovery", { valueScore: 0, inventoryKind: "discovery", totalPrice: undefined, pricePerNight: undefined, currency: undefined }), makeHotel("zero", { valueScore: 0, totalPrice: 0 }), makeHotel("bookable", { valueScore: 0, totalPrice: 250 })]);
  assert.equal(previews[1]?.result.id, "bookable");
  assert.deepEqual(selectDealsHotelPreviews([]), []);
});
test("hotel selection fills fewer results without duplication", () => {
  const previews = selectDealsHotelPreviews([makeHotel("only", { valueScore: 0, totalPrice: 0, reviewScore: undefined })]);
  assert.deepEqual(previews.map(({ result }) => result.id), ["only"]);
  assert.equal(previews[0]?.badgeKey, "deals.results.preview.more.badge");
  assert.equal(previews[0]?.reasonKey, undefined);
});
test("hotel selection does not give absolute category badges to runners-up", () => {
  const previews = selectDealsHotelPreviews([makeHotel("winner", { valueScore: 100, totalPrice: 100, reviewScore: 10, reviewScale: 10 }), makeHotel("next", { valueScore: 80, totalPrice: 150, reviewScore: 9, reviewScale: 10 }), makeHotel("third", { valueScore: 70, totalPrice: 200, reviewScore: 8, reviewScale: 10 })]);
  assert.deepEqual(previews.map(({ result }) => result.id), ["winner", "next", "third"]);
  assert.deepEqual(previews.map(({ badgeKey }) => badgeKey), ["deals.results.hotel.recommended.badge", "deals.results.preview.more.badge", "deals.results.preview.more.badge"]);
});
test("option count interpolation supports previews and returned-only copy", () => {
  assert.equal(formatDealsOptionCount("{{visible}} recommended previews from {{total}} returned options", 3, 15), "3 recommended previews from 15 returned options");
  assert.equal(formatDealsOptionCount("{{total}} options returned", 2, 2), "2 options returned");
});
