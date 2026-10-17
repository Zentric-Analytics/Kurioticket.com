import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const hotel = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const rates = readFileSync("src/features/search/NativeHotelRatesSection.tsx", "utf8");
test("all three native Hotel Details tabs have no persistent booking dock", () => {
  assert.doesNotMatch(hotel, /bookingDock|bookingDockButton|selectedRate\.totalPrice/);
  assert.match(hotel, /contentContainerStyle=\{\{ paddingBottom: 24 \+ inset\.bottom \}\}/);
  assert.match(hotel, /activeHotelTab === "deals"/);
  assert.match(hotel, /activeHotelTab === "details"/);
  assert.match(hotel, /activeHotelTab === "reviews"/);
});
test("every distinct provider offer gets an independent actionable rate card", () => {
  assert.match(rates, /for \(const \{ hotel, providerDetails \} of providerEntries\)/);
  assert.match(rates, /id: `provider:\$\{hotel\.id\}`/);
  assert.match(rates, /offerId: hotel\.id/);
  assert.match(rates, /new Set<string>\(\)/);
  assert.match(rates, /View deal/);
  assert.match(rates, /onPress=\{\(\) => onViewDeal\(row\.id\)\}/);
  assert.match(rates, /disabled=\{!row\.actionable \|\| pendingRateId !== null\}/);
});
test("rate info stays attached to its offer and property facts appear only in Overview", () => {
  assert.match(rates, /expandedRateId === row\.id/);
  assert.match(rates, /row\.rateFacts\.map/);
  assert.match(rates, /Booking conditions/);
  assert.doesNotMatch(hotel, /NativeSupplierInformation|Property information supplied by KAYAK/);
  assert.doesNotMatch(hotel, /Rate information —/);
});
test("native deal handoffs use the actual selected offer ID through verified server redirect", () => {
  assert.match(hotel, /rateRows\.find\(row => row\.id === rateId && row\.actionable\)/);
  assert.match(hotel, /travelApi\.hotelRedirect\(selected\.offerId\)/);
  assert.match(hotel, /await openProviderInApp\(response\.url\)/);
  assert.match(hotel, /selected\.offerId === "internal-rooms"/);
  const api = readFileSync("src/api/travelApi.ts", "utf8");
  assert.match(api, /hotelRedirect: \(id: string\)/);
  assert.match(api, /type: "hotel", sourcePage: "native_hotel_details"/);
});
