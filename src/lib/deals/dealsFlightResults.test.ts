import test from "node:test";
import assert from "node:assert/strict";
import { buildDealsFlightDetailsJourneyUrl, buildDealsFlightInventoryIdentity, buildDealsFlightResultsSearchInput } from "./dealsFlightResults";
import { createDefaultDealsSearch, parseDealsSearchParams } from "./dealsSearchParams";
import { getRequiredDealsJourneyStage, normalizeDealsJourneyFlightId } from "./dealsJourneyRoutes";

const search = () => { const value = createDefaultDealsSearch(); value.mode = "flight-car"; value.flightTripType = "round-trip"; value.flightOriginCode = " los "; value.flightDestinationCode = " jfk "; value.flightDepartureDate = "2026-10-01"; value.flightReturnDate = "2026-10-09"; value.flightAdults = 2; value.flightChildren = 1; value.flightInfants = 1; value.flightCabinClass = "premium-economy"; return value; };

test("guided Flight request maps canonical Deals search exactly", () => {
  assert.deepEqual(buildDealsFlightResultsSearchInput(search(), "EUR"), { tripType: "round-trip", origin: "LOS", destination: "JFK", departureDate: "2026-10-01", returnDate: "2026-10-09", adults: 2, children: 1, infants: 1, travelers: 4, cabinClass: "premium-economy", currency: "EUR" });
});

test("one-way guided Flight request omits return date", () => { const value = search(); value.flightTripType = "one-way"; assert.equal("returnDate" in buildDealsFlightResultsSearchInput(value, "USD"), false); });

test("filter and sort state are excluded from inventory identity", () => { const value = search(); const first = buildDealsFlightInventoryIdentity(value, "USD"); const second = buildDealsFlightInventoryIdentity(value, "USD"); assert.equal(first, second); });

test("transient Flight IDs normalize safely", () => { assert.equal(normalizeDealsJourneyFlightId(" flight-1 "), "flight-1"); assert.equal(normalizeDealsJourneyFlightId(""), null); assert.equal(normalizeDealsJourneyFlightId("x".repeat(257)), null); assert.equal(normalizeDealsJourneyFlightId("abc\n123"), null); assert.equal(normalizeDealsJourneyFlightId(123), null); });

test("guided Flight details URLs preserve canonical search and one encoded flightId", () => { const href = buildDealsFlightDetailsJourneyUrl(search(), " fare /?&=✓ "); assert.ok(href); const url = new URL(href, "https://example.test"); assert.equal(url.pathname, "/deals/journey/flight-details"); assert.equal(url.searchParams.getAll("flightId").length, 1); assert.equal(url.searchParams.get("flightId"), "fare /?&=✓"); assert.equal(parseDealsSearchParams(url.searchParams).flightOriginCode, "LOS"); assert.equal(buildDealsFlightDetailsJourneyUrl(search(), "\n"), null); });

test("route guard accepts transient Flight details but does not unlock Car", () => { assert.equal(getRequiredDealsJourneyStage("flight-details", "flight-car", null, null, "f1"), "flight-details"); assert.equal(getRequiredDealsJourneyStage("flight-details", "flight-car", { flight: { id: "f" } } as never), "flight-details"); assert.equal(getRequiredDealsJourneyStage("flight-details", "flight-car", null), "flight-results"); assert.equal(getRequiredDealsJourneyStage("car-results", "flight-car", null, null, "f1"), "flight-results"); assert.equal(getRequiredDealsJourneyStage("flight-results", "hotel-flight", null, null, "f1"), "hotel-results"); assert.equal(getRequiredDealsJourneyStage("flight-results", "flight-car", null), "flight-results"); });
