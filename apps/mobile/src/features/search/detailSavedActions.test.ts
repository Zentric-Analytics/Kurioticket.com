import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const detailSource = read("src/features/search/NativeFlightDetails.tsx");
const approvedDetailSource = read("src/features/search/ApprovedDetailScreen.tsx");
const resultsSource = read("src/features/search/ApprovedResultsScreen.tsx");
const canonicalHook = read("src/storage/useCanonicalSaved.ts");
const flightHook = read("src/storage/useSavedFlights.ts");
const hotelDetail = approvedDetailSource.slice(approvedDetailSource.indexOf("function HotelDetail"), approvedDetailSource.indexOf("const detailIcons"));

test("authoritative flight detail reflects saved state and toggles the current server offer", () => {
  assert.match(detailSource, /const savedOffer = savedFlightOffer\(details, selected\)/);
  assert.match(detailSource, /savedFlights\.savedFlights\.has\(flightSavedSignature\(savedOffer\)\)/);
  assert.match(detailSource, /savedFlights\.toggle\(savedOffer, editParams\)/);
  assert.match(detailSource, /label=\{saved \? "Remove saved flight" : "Save flight"\}/);
  assert.match(detailSource, /bookingUrl: ""/);
  assert.match(detailSource, /partnerRedirectUrl: ""/);
});

test("hotel detail replaces the passive heart with a canonical saved button", () => {
  assert.match(hotelDetail, /useCanonicalSaved\(\)/);
  assert.match(hotelDetail, /item\.type === "hotel"[\s\S]*?\.id === result\.id/);
  assert.match(hotelDetail, /<Pressable[\s\S]*?`Remove \$\{result\.name\} hotel from saved`[\s\S]*?`Save \$\{result\.name\} hotel`/);
  assert.match(hotelDetail, /accessibilityState=\{\{ selected: saved \}\}/);
  assert.match(hotelDetail, /onPress=\{\(\) => void canonical\.toggleHotel\(result, params\)\}/);
});

test("flight details exclusively own flight saving while Saved remains canonical", () => {
  assert.doesNotMatch(resultsSource, /useSavedFlights\(\)|toggleSavedFlight\(item, params\)|flightSavedSignature\(item\)/);
  assert.match(detailSource, /useSavedFlights\(\)/);
  assert.match(resultsSource, /function HotelCard[\s\S]*?useCanonicalSaved\(\)/);
  assert.match(hotelDetail, /useCanonicalSaved\(\)/);
  assert.match(flightHook, /savedRepositoryFor\(resolvedUserId\)\.toggleFlight\(flight, searchParams\)/);
});

test("guest saved taps use the existing sign-in flows", () => {
  assert.match(canonicalHook, /favoriteAction\(userId\) === "sign-in"/);
  assert.match(canonicalHook, /showFavoriteSignInPrompt\("\/saved"\)/);
  assert.match(flightHook, /favoriteAction\(resolvedUserId\) === "sign-in"[\s\S]*?showFavoriteSignInPrompt\("\/saved"\)/);
});

test("flight detail save keeps the authoritative reconstructed search context", () => {
  assert.doesNotMatch(resultsSource, /toggleSavedFlight\(item, params\)/);
  assert.match(detailSource, /const editParams = nativeFlightEditSearchParams\(details, params\)/);
  assert.match(detailSource, /savedFlights\.toggle\(savedOffer, editParams\)/);
});
