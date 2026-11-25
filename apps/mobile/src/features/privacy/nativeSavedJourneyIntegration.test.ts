import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("iOS Flight provider handoff uses an in-app browser without changing Android fallback", () => {
  const flight = read("src/features/search/NativeFlightDetails.tsx");
  assert.match(flight, /Platform\.OS === "ios"\) \{ await journeyEvents\.settleBeforeExternalHandoff/);
  assert.match(flight, /WebBrowser\.openBrowserAsync\(response\.url, \{ dismissButtonStyle: "close" \}\)/);
  assert.match(flight, /else await Linking\.openURL\(response\.url\)/);
  assert.match(flight, /travelApi\.flightRedirect\(offerId, \{ handoff: journeyEvents\.prepareHandoff/);
});

test("confirmed native Flight Hotel and Car saves emit one optional search-linked receipt", () => {
  const flight = read("src/storage/useSavedFlights.ts");
  const saved = read("src/storage/useCanonicalSaved.ts");
  const api = read("src/api/travelApi.ts");
  assert.match(flight, /await repository\.toggleFlight\(flight, searchParams\)/);
  assert.match(flight, /void recordNativeSavedInteraction/);
  assert.match(saved, /await repository\.toggleHotel\(hotel, params\)/);
  assert.match(saved, /await repository\.toggleCar\(car, params\)/);
  assert.match(saved, /void recordNativeSavedInteraction/);
  assert.match(api, /"saved_item_confirmed" \| "saved_item_removed"/);
});

test("optional native saved tracking fails closed on identity, search ID and consent", () => {
  const tracker = read("src/features/privacy/nativeSavedTracking.ts");
  const identity = read("src/features/privacy/visitorIdentityCoordinator.ts");
  assert.match(tracker, /requestUuid\.test\(input\.requestId\)/);
  assert.match(tracker, /visitorIdentity\.trackingContext\(\)/);
  assert.match(tracker, /digestStringAsync\(CryptoDigestAlgorithm\.SHA256, input\.resultId\)/);
  assert.match(tracker, /visitorIdentity\.trackingContext\(\) !== context/);
  assert.match(identity, /trackingContext =/);
  assert.doesNotMatch(tracker, /record.*before.*toggle/i);
});

test("all native product save controls retain the provider result and request correlation", () => {
  const flight = read("src/features/search/NativeFlightDetails.tsx");
  const hotel = read("src/features/search/HotelDetailsScreen.tsx");
  const results = read("src/features/search/ApprovedResultsScreen.tsx");
  const car = read("src/features/search/CarResultCard.tsx");
  const carState = read("src/features/search/carSavedState.ts");
  assert.match(flight, /savedFlights\.toggle\(savedOffer,.*journeyRequestId\)/);
  assert.match(hotel, /canonical\.toggleHotel\(result, params, journeyRequestId\)/);
  assert.match(results, /canonical\.toggleHotel\(result, params, requestId\)/);
  assert.match(car, /useSavedCar\(result, searchParams, journeyRequestId\)/);
  assert.match(carState, /savedState\.toggleCar\(result, searchParams, journeyRequestId/);
});
