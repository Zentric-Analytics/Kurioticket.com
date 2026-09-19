import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detailSource = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const hotel = detailSource.slice(detailSource.indexOf("function HotelDetail"));
const ratesSource = readFileSync("src/features/search/NativeHotelRatesSection.tsx", "utf8");
const webCompare = readFileSync(
  "../../src/components/results/hotelDetails/HotelPriceComparisonSection.tsx",
  "utf8",
);
const webContinuation = readFileSync(
  "../../src/components/results/hotelDetails/hotelBookingContinuation.ts",
  "utf8",
);

function styleRule(source: string, name: string, nextName: string) {
  const stylesheetStart = source.indexOf("const s = StyleSheet.create({");
  assert.notEqual(stylesheetStart, -1, "stylesheet must exist");
  const start = source.indexOf(`  ${name}:`, stylesheetStart);
  const end = source.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return source.slice(start, end);
}

test("active Rates tab delegates selectable Hotel rate rows", () => {
  assert.match(hotel, /activeHotelTab === "deals"/);
  assert.match(hotel, /const rateRows = buildNativeHotelRateRows/);
  assert.match(hotel, /<NativeHotelRatesSection/);
  assert.match(hotel, /rows=\{rateRows\}/);
  assert.match(hotel, /selectedRateId=\{selectedRateIdForView\}/);
  assert.match(hotel, /onSelectRate=\{setSelectedRateId\}/);
  assert.match(hotel, /stayDateText=\{staySummary\.dateText\}/);
  assert.match(hotel, /nightText=\{staySummary\.nightText\}/);
});

test("Rates collapse Kurioticket room inventory into one provider-comparison row", () => {
  assert.match(ratesSource, /id: "provider-kurioticket"/);
  assert.match(ratesSource, /providerName: "Kurioticket"/);
  assert.match(ratesSource, /offerId: internalOffer\.id/);
  assert.match(ratesSource, /nightlyPrice:[\s\S]*nightlyPrice\.formatted/);
  assert.match(ratesSource, /totalPrice:[\s\S]*totalPrice\.formatted/);
  assert.doesNotMatch(ratesSource, /roomOptionId|roomOptions|roomRatePresentation|rateTitle|rateMeta/);
});

test("provider handoff is represented by the same provider-price row shape", () => {
  assert.match(ratesSource, /offers\.find\(\(offer\) => offer\.kind === "provider-handoff"\)/);
  assert.match(ratesSource, /const visibleProviderOffer = providerOffer \?\? displayOnlyKayakOffer/);
  assert.match(ratesSource, /providerName: providerName\.trim\(\) \|\| "Provider"/);
  assert.match(ratesSource, /nightlyPrice:[\s\S]*"Price on provider"/);
  assert.match(ratesSource, /totalPrice:[\s\S]*"Price on provider"/);
  assert.match(ratesSource, /actionable: Boolean\(providerOffer\)/);
  assert.doesNotMatch(ratesSource, /providerRoomPresentation|providerRateTerms|cancellationInfo|roomType/);
});

test("Hotel deal cards intentionally omit room and fare-condition copy", () => {
  for (const removed of [
    "Compact room",
    "Deluxe",
    "Suite",
    "roomRatePresentation",
    "providerRoomPresentation",
    "conciseCondition",
    "rateTitle",
    "rateMeta",
  ]) assert.doesNotMatch(ratesSource, new RegExp(removed));
});

test("selected Hotel provider uses the same radio-card treatment as Flight Compare deals", () => {
  assert.match(ratesSource, /accessibilityRole="radiogroup"/);
  assert.match(ratesSource, /accessibilityLabel="Hotel deal options"/);
  assert.match(ratesSource, /accessibilityRole="radio"/);
  assert.match(ratesSource, /const selectedBackground = theme\.dark \? "#142844" : "#F4F8FF"/);
  assert.match(ratesSource, /borderColor: selected \? accentColor : surfaceBorderColor/);
  assert.match(ratesSource, /s\.dealRadio/);
  assert.match(ratesSource, /s\.dealRadioDot/);
  assert.match(styleRule(ratesSource, "dealCard", "dealCardSelectedLight"), /minHeight: 96[\s\S]*borderRadius: 14[\s\S]*paddingHorizontal: 15[\s\S]*paddingVertical: 13/);
});

test("Kurioticket uses the same text identity treatment as every other Hotel provider", () => {
  assert.match(ratesSource, /providerName: "Kurioticket"/);
  assert.match(ratesSource, /row\.providerName/);
  assert.doesNotMatch(ratesSource, /kurioticket-logo-primary-light-bg|<Image/);
  assert.match(styleRule(ratesSource, "dealProvider", "dealRadio"), /fontFamily: appFonts\.bold/);
  assert.match(styleRule(ratesSource, "dealPrice", "dealPriceUnavailable"), /fontFamily: appFonts\.bold/);
});

test("Rates use the Flight Compare deals card hierarchy without room-detail clutter", () => {
  assert.match(styleRule(ratesSource, "dealList", "dealCard"), /gap: 10[\s\S]*paddingVertical: 12/);
  assert.match(styleRule(ratesSource, "dealTop", "dealProvider"), /flexDirection: "row"[\s\S]*justifyContent: "space-between"/);
  assert.match(styleRule(ratesSource, "dealBottom", "dealPriceLabel"), /flexDirection: "row"[\s\S]*justifyContent: "space-between"/);
  assert.match(ratesSource, /\[stayDateText, nightText\]\.filter\(Boolean\)\.join\(" · "\)/);
  assert.match(ratesSource, /row\.providerName/);
  assert.match(ratesSource, /row\.nightlyPrice/);
  assert.doesNotMatch(ratesSource, /row\.title|row\.meta|Compact room|Deluxe|Suite/);
});

test("Rates show provider and nightly price while one persistent dock continues to the selected provider", () => {
  assert.match(ratesSource, /"per night"/);
  assert.match(ratesSource, /onPress=\{row\.actionable \? \(\) => onSelectRate\(row\.id\) : undefined\}/);
  assert.match(hotel, /selectedRate\.totalPrice/);
  assert.match(hotel, /selectedRate\.totalLabel/);
  assert.match(hotel, /const bookingActionLabel = "View deal"/);
  assert.doesNotMatch(hotel, /Continue to|Choose room/);
  assert.match(hotel, /bookingDockButtonText\}>\{bookingActionLabel\}<\/Text>/);
  assert.match(hotel, /onPress=\{\(\) => void continueSelectedRate\(\)\}/);
});

test("persistent booking dock remains outside tab content and matches Flight spacing", () => {
  assert.match(hotel, /const selectedRate: NativeHotelRateRow \| null/);
  assert.match(hotel, /rateRows\.find\(\(row\) => row\.id === selectedRateId && row\.actionable\)/);
  assert.match(hotel, /detailsStatus !== "loading" && selectedRate/);
  assert.match(hotel, /s\.bookingDock/);
  assert.match(hotel, /contentContainerStyle=\{\{ paddingBottom: selectedRate \? 120 \+ inset\.bottom : 24 \+ inset\.bottom \}\}/);
  assert.match(hotel, /paddingBottom: Math\.max\(inset\.bottom, 10\)/);
  assert.ok(hotel.indexOf("s.bookingDock") > hotel.indexOf("</ScrollView>"));
});

test("Kurioticket continuation hands off to the Kurioticket web Hotel page", () => {
  assert.match(hotel, /nativeKurioticketHotelDetailsUrl/);
  assert.match(hotel, /const kurioticketHandoffAvailable =[\s\S]*?roomOptions\.length > 0 && Boolean\(kurioticketWebUrl\)/);
  assert.match(hotel, /selectedRate\.offerId === "internal-rooms"[\s\S]*?\? kurioticketWebUrl/);
  assert.match(hotel, /await openProviderInApp\(targetUrl\)/);
  assert.doesNotMatch(hotel, /HotelRoomOptionsModal|setRoomsOpen|presentedRoomOptions|createHotelRoomDisplayPrice/);
});

test("Rates preserves loading and truthful empty states", () => {
  assert.match(ratesSource, /if \(detailsStatus === "loading"\) return null/);
  assert.match(ratesSource, /No reservable rates available/);
  assert.match(ratesSource, /Try updating your stay or check again later/);
});

test("web reference remains unchanged while native Rates is independently aligned", () => {
  assert.match(webCompare, /offer\.providerLogoUrl/);
  assert.match(webCompare, /offer\.nightlyPrice/);
  assert.match(webContinuation, /providerLogoUrl: "\/brand\/kurioticket-logo-primary-light-bg\.svg"/);
  assert.match(webContinuation, /action: \{ kind: "internal-room-flow" \}/);
});
