import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
  const start = source.indexOf(`  ${name}:`);
  const end = source.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return source.slice(start, end);
}

test("active Rates tab delegates only its presentation to the Rates component", () => {
  assert.match(hotel, /activeHotelTab === "deals"/);
  assert.match(hotel, /<NativeHotelRatesSection/);
  assert.match(hotel, /offers=\{hotelOffers\}/);
  assert.match(hotel, /selectedOfferId=\{selectedOffer\?\.id \?\? null\}/);
  assert.match(hotel, /onSelectOffer=\{setSelectedOfferId\}/);
  assert.match(hotel, /roomOptions=\{presentedRoomOptions\}/);
  assert.match(hotel, /nightlyPrice=\{nightlyPrice \?\? null\}/);
  assert.doesNotMatch(hotel, /<Text[^>]*>Rates<\/Text>[\s\S]*?stay\.dateText/);
  assert.doesNotMatch(hotel, /HotelOfferAmenityList/);
});

test("Rates opens directly on the offer card without chips or a room heading", () => {
  assert.doesNotMatch(ratesSource, /roomRateTags|chipViewport|chipRow|chipText/);
  assert.doesNotMatch(ratesSource, /roomGroupHeading|groupHeading/);
  assert.doesNotMatch(ratesSource, /Breakfast included|Room only|Flexible terms|Taxes included/);
  assert.match(styleRule(ratesSource, "section", "groupCard"), /paddingBottom: 4/);
  assert.doesNotMatch(styleRule(ratesSource, "section", "groupCard"), /paddingTop/);
  assert.doesNotMatch(styleRule(ratesSource, "groupCard", "rateRow"), /marginTop/);
});

test("Rates grouped card stays compact while preserving the real offer rows", () => {
  assert.match(styleRule(ratesSource, "groupCard", "rateRow"), /overflow: "hidden"[\s\S]*borderWidth: 1[\s\S]*borderRadius: 12/);
  assert.match(styleRule(ratesSource, "rateRow", "rateRowPressed"), /minHeight: 134[\s\S]*padding: 16[\s\S]*gap: 14/);
  assert.match(styleRule(ratesSource, "rateCopy", "brandLogo"), /flex: 1[\s\S]*minWidth: 0[\s\S]*justifyContent: "flex-start"/);
  assert.match(ratesSource, /index > 0 && \{ borderTopColor: theme\.border, borderTopWidth: StyleSheet\.hairlineWidth \}/);
});

test("internal rate row keeps the accessible bundled Kurioticket wordmark and real room copy", () => {
  assert.ok(existsSync("assets/kurioticket-logo-primary-light-bg.png"));
  assert.match(ratesSource, /internal \? \([\s\S]*?<Image[\s\S]*?accessibilityLabel="Kurioticket"[\s\S]*?accessibilityIgnoresInvertColors[\s\S]*?require\("\.\.\/\.\.\/\.\.\/assets\/kurioticket-logo-primary-light-bg\.png"\)/);
  assert.match(styleRule(ratesSource, "brandLogo", "providerName"), /width: 104[\s\S]*height: 22[\s\S]*marginBottom: 10/);
  assert.match(ratesSource, /const representativeRoom = roomOptions\[0\] \?\? null/);
  assert.match(ratesSource, /const internalMeta = representativeRoom\?\.cancellationInfo\.trim\(\) \?\? ""/);
  assert.match(ratesSource, /const parts = name\.split/);
});

test("Rates uses a narrower right price/action column like the reference", () => {
  assert.match(styleRule(ratesSource, "rateActionColumn", "priceBlock"), /width: 112[\s\S]*alignItems: "flex-end"[\s\S]*justifyContent: "space-between"/);
  assert.match(styleRule(ratesSource, "price", "perNight"), /fontSize: 20[\s\S]*lineHeight: 26[\s\S]*fontWeight: "700"[\s\S]*textAlign: "right"/);
  assert.match(styleRule(ratesSource, "selectButton", "selectButtonText"), /minWidth: 88[\s\S]*height: 44[\s\S]*borderRadius: 10/);
  assert.match(ratesSource, /\{selected \? "Selected" : "Select"\}/);
  assert.match(ratesSource, /accessibilityRole="radio"/);
  assert.match(ratesSource, /accessibilityState=\{\{ selected \}\}/);
  assert.match(ratesSource, /onPress=\{\(\) => onSelectOffer\(offer\.id\)\}/);
});

test("Rates keeps room-specific display pricing without changing booking selection", () => {
  assert.match(ratesSource, /representativeRoom\?\.displayPrice\?\.nightly \?\? nightlyPrice/);
  assert.match(hotel, /const selectedOffer =[\s\S]*?hotelOffers\[0\] \?\? null/);
  assert.match(hotel, /selectedOffer\?\.kind === "internal-room-flow"[\s\S]*?setRoomsOpen\(true\)/);
  assert.match(hotel, /selectedOffer\?\.kind !== "provider-handoff"[\s\S]*?Linking\.openURL\(redirectUrl\)/);
  assert.match(hotel, /disabled=\{!canContinue\}/);
  assert.match(hotel, /onPress=\{\(\) => void continueBooking\(\)\}/);
});

test("Rates keeps the loading guard for the no-live-checkout empty state", () => {
  assert.match(ratesSource, /\) : detailsStatus !== "loading" \? \(/);
  assert.match(ratesSource, /Planning inventory · no live checkout/);
});

test("active sticky estimated total typography remains unchanged", () => {
  assert.match(styleRule(detailSource, "dockTotal", "dockPerNight"), /fontSize: 24[\s\S]*lineHeight: 30[\s\S]*fontWeight: "800"[\s\S]*fontFamily: appFonts\.extraBold[\s\S]*textAlign: "left"/);
  assert.match(hotel, /estimated stay total[\s\S]*?s\.dockTotal/);
});

test("web reference remains unchanged while native Rates is independently aligned", () => {
  assert.match(webCompare, /offer\.providerLogoUrl/);
  assert.match(webCompare, /offer\.nightlyPrice/);
  assert.match(webContinuation, /providerLogoUrl: "\/brand\/kurioticket-logo-primary-light-bg\.svg"/);
  assert.match(webContinuation, /action: \{ kind: "internal-room-flow" \}/);
});
