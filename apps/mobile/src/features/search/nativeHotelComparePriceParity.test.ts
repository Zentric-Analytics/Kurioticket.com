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

test("Rates presents every supplied Kurioticket room option instead of collapsing to the first one", () => {
  assert.match(ratesSource, /for \(const option of roomOptions\)/);
  assert.match(ratesSource, /id: `room-\$\{option\.id\}`/);
  assert.match(ratesSource, /roomOptionId: option\.id/);
  assert.match(ratesSource, /nightlyPrice: nightly\?\.formatted/);
  assert.match(ratesSource, /totalPrice: total\?\.formatted/);
  assert.match(ratesSource, /const presentation = roomRatePresentation\(option\)/);
  assert.match(ratesSource, /title: presentation\.title/);
  assert.match(ratesSource, /meta: presentation\.meta/);
  assert.doesNotMatch(ratesSource, /roomOptions\[0\]/);
  assert.doesNotMatch(ratesSource, /STATIC_RATE_GROUPS|\$1,225|Standard Room, 1 Queen Bed/);
});

test("provider handoff keeps room terms, nightly price, and stay total separate", () => {
  assert.match(ratesSource, /offers\.find\(\(offer\) => offer\.kind === "provider-handoff"\)/);
  assert.match(ratesSource, /const visibleProviderOffer = providerOffer \?\? displayOnlyKayakOffer/);
  assert.match(ratesSource, /const providerRoom = providerRoomPresentation\(roomType\)/);
  assert.match(ratesSource, /title: providerRoom\.title/);
  assert.match(ratesSource, /meta: providerRateTerms\(providerRoom\.terms, cancellationInfo\)/);
  assert.match(ratesSource, /nightlyPrice: hasPrice && nightlyPrice \? nightlyPrice\.formatted : "Price on provider"/);
  assert.match(ratesSource, /totalPrice: hasPrice && totalPrice \? totalPrice\.formatted : "Price on provider"/);
  assert.match(ratesSource, /actionable: Boolean\(providerOffer\)/);
});

test("provider room parsing keeps only one concise supporting condition", () => {
  assert.match(ratesSource, /split\(\/\\s\+\[—–-\]\\s\+\//);
  assert.match(ratesSource, /function conciseCondition/);
  assert.match(ratesSource, /\.map\(conciseCondition\)[\s\S]*?\.find\(Boolean\)/);
  assert.match(ratesSource, /return condition \? \[condition\] : \[\]/);
  assert.doesNotMatch(ratesSource, /\.slice\(0, 3\)/);
});

test("selected Hotel rate keeps the existing multi-rate tint while a single rate remains white", () => {
  assert.match(ratesSource, /const selected = row\.id === selectedRateId/);
  assert.match(ratesSource, /const selectedBackground = theme\.dark[\s\S]*?rgba\(0, 75, 184, 0\.035\)/);
  assert.match(ratesSource, /const showSelectedBackground = rows\.length > 1 && selected/);
  assert.match(ratesSource, /backgroundColor: showSelectedBackground \? selectedBackground : theme\.surface/);
  assert.match(ratesSource, /accessibilityState=\{\{ selected, disabled: !row\.actionable \}\}/);
  assert.doesNotMatch(ratesSource, /selectedBar|showSelectionMarker|<Check|selectedMark|borderColor: selected|borderWidth: selected|accessibilityRole="radio"|radioDot|radiogroup/);
});

test("Kurioticket cards keep the bundled wordmark and app typography", () => {
  assert.ok(existsSync("assets/kurioticket-logo-primary-light-bg.png"));
  assert.match(ratesSource, /providerKind === "kurioticket"[\s\S]*?<Image[\s\S]*?accessibilityLabel="Kurioticket"[\s\S]*?require\("\.\.\/\.\.\/\.\.\/assets\/kurioticket-logo-primary-light-bg\.png"\)/);
  assert.match(styleRule(ratesSource, "rateTitle", "rateMeta"), /fontFamily: appFonts\.semibold/);
  assert.match(styleRule(ratesSource, "rateMeta", "priceBlock"), /fontFamily: appFonts\.regular/);
  assert.match(styleRule(ratesSource, "price", "priceUnit"), /fontFamily: appFonts\.bold/);
});

test("Rates use compact grouped rows, date context only, and concise summary text", () => {
  assert.match(styleRule(ratesSource, "rateList", "rateDivider"), /borderWidth: 1[\s\S]*borderRadius: 10[\s\S]*overflow: "hidden"/);
  assert.match(styleRule(ratesSource, "rateDivider", "rateCard"), /height: StyleSheet\.hairlineWidth/);
  assert.match(styleRule(ratesSource, "rateCard", "rateCardPressed"), /minHeight: 88[\s\S]*paddingHorizontal: 16[\s\S]*paddingVertical: 10[\s\S]*justifyContent: "center"/);
  assert.match(styleRule(ratesSource, "rateMain", "providerIdentity"), /flexDirection: "row"[\s\S]*alignItems: "center"[\s\S]*gap: 12/);
  assert.match(styleRule(ratesSource, "priceBlock", "price"), /alignItems: "flex-end"/);
  assert.doesNotMatch(ratesSource, />Rates<\/Text>/);
  assert.match(ratesSource, /\[stayDateText, nightText\]\.filter\(Boolean\)\.join\(" · "\)/);
  assert.match(ratesSource, /function conciseCondition/);
  assert.match(ratesSource, /meta: \[suffixCondition \|\| cancellationCondition \|\| mealCondition \|\| featureCondition\]\.filter\(Boolean\)/);
  assert.match(ratesSource, /row\.meta\.join\(" · "\)/);
});

test("Rates render nightly price only; continuation lives in the persistent bottom dock", () => {
  assert.match(ratesSource, />per night<\/Text>/);
  assert.match(ratesSource, /onPress=\{row\.actionable \? \(\) => onSelectRate\(row\.id\) : undefined\}/);
  assert.doesNotMatch(ratesSource, /actionLabel: "Choose room"|actionControl/);
  assert.match(hotel, /selectedRate\.totalPrice/);
  assert.match(hotel, /selectedRate\.totalLabel/);
  assert.match(hotel, />Choose room<\/Text>/);
  assert.match(hotel, /onPress=\{\(\) => void continueSelectedRate\(\)\}/);
});

test("persistent booking dock remains outside tab content and follows selected rate", () => {
  assert.match(hotel, /const selectedRate: NativeHotelRateRow \| null/);
  assert.match(hotel, /rateRows\.find\(\(row\) => row\.id === selectedRateId && row\.actionable\)/);
  assert.match(hotel, /detailsStatus !== "loading" && selectedRate/);
  assert.match(hotel, /s\.bookingDock/);
  assert.match(hotel, /contentContainerStyle=\{\{ paddingBottom: selectedRate \? 108 \+ inset\.bottom : 24 \+ inset\.bottom \}\}/);
  assert.ok(hotel.indexOf("s.bookingDock") > hotel.indexOf("</ScrollView>"));
});

test("internal continuation remains tied to the tapped room option", () => {
  assert.match(hotel, /if \(selectedRate\.offerId === "internal-rooms"\)/);
  assert.match(hotel, /selectedRate\?\.roomOptionId[\s\S]*?presentedRoomOptions\.filter\(\(option\) => option\.id === selectedRate\.roomOptionId\)/);
  assert.match(hotel, /setRoomsOpen\(true\)/);
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
