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

test("active Rates tab delegates current rate presentation", () => {
  assert.match(hotel, /activeHotelTab === "deals"/);
  assert.match(hotel, /<NativeHotelRatesSection/);
  assert.match(hotel, /offers=\{hotelOffers\}/);
  assert.match(hotel, /roomOptions=\{presentedRoomOptions\}/);
  assert.match(hotel, /nightlyPrice=\{nightlyPrice \?\? null\}/);
});

test("Rates keeps only one current offer card and removes room-category preview sections", () => {
  assert.match(ratesSource, /const option = roomOptions\[0\]/);
  assert.match(ratesSource, /rows\.push\(/);
  assert.match(ratesSource, /rows\.unshift\(/);
  assert.match(ratesSource, /const row = rows\[0\] \?\? null/);
  assert.doesNotMatch(ratesSource, /withCompactRoomSectionPreview|preview-deluxe-room-options|preview-suite-room-options/);
  assert.doesNotMatch(ratesSource, /groupTitle|groupSection|groupCards/);
  assert.doesNotMatch(ratesSource, /Compact room options|Deluxe room options|Suite room options/);
});

test("Rates derives its single Kurioticket fallback card from supplied room data", () => {
  assert.match(ratesSource, /const option = roomOptions\[0\]/);
  assert.match(ratesSource, /const title = roomRateTitle\(option\)/);
  assert.match(ratesSource, /option\.displayPrice\?\.total/);
  assert.match(ratesSource, /meaningfulRateMeta\(option, title\)/);
  assert.doesNotMatch(ratesSource, /STATIC_RATE_GROUPS|\$1,225|Standard Room, 1 Queen Bed/);
});

test("provider handoff takes precedence and shows the supplied provider price", () => {
  assert.match(ratesSource, /offers\.find\(\(offer\) => offer\.kind === "provider-handoff"\)/);
  assert.match(ratesSource, /rows\.unshift\(\{/);
  assert.match(ratesSource, /providerName: providerName\.trim\(\) \|\| "Provider"/);
  assert.match(ratesSource, /const providerPrice = hasPrice \? nightlyPrice : null/);
  assert.match(ratesSource, /price: providerPrice \? `\$\{providerPrice\.formatted\}\/night` : "Price on provider"/);
  assert.match(ratesSource, /\$\{providerPrice\.accessibilityLabel\} per night/);
});

test("Kurioticket fallback keeps the bundled wordmark and existing app fonts", () => {
  assert.ok(existsSync("assets/kurioticket-logo-primary-light-bg.png"));
  assert.match(ratesSource, /providerKind === "kurioticket"[\s\S]*?<Image[\s\S]*?accessibilityLabel="Kurioticket"[\s\S]*?require\("\.\.\/\.\.\/\.\.\/assets\/kurioticket-logo-primary-light-bg\.png"\)/);
  assert.match(styleRule(ratesSource, "rateTitle", "benefitList"), /fontFamily: appFonts\.bold/);
  assert.match(styleRule(ratesSource, "rateMeta", "rateActionColumn"), /fontFamily: appFonts\.regular/);
  assert.match(styleRule(ratesSource, "actionControlText", "emptyCard"), /fontFamily: appFonts\.bold/);
});

test("Rates keeps one square metasearch card", () => {
  assert.match(styleRule(ratesSource, "section", "rateCard"), /paddingBottom: 12/);
  assert.match(styleRule(ratesSource, "rateCard", "rateCopy"), /minHeight: 134[\s\S]*borderWidth: 1[\s\S]*borderRadius: 0[\s\S]*paddingHorizontal: 16[\s\S]*paddingVertical: 20[\s\S]*gap: 12/);
  assert.match(styleRule(ratesSource, "brandLogo", "providerName"), /width: 88[\s\S]*height: 18[\s\S]*marginBottom: 8/);
  assert.match(styleRule(ratesSource, "benefitList", "rateMeta"), /marginTop: "auto"[\s\S]*paddingTop: 18[\s\S]*gap: 1/);
  assert.match(styleRule(ratesSource, "rateActionColumn", "price"), /width: 104[\s\S]*alignItems: "flex-end"[\s\S]*justifyContent: "space-between"/);
});

test("Rates shows stay or provider price and keeps the visual-only Reserve action", () => {
  assert.match(ratesSource, /\$\{total\.accessibilityLabel\} stay price/);
  assert.match(ratesSource, /\$\{providerPrice\.accessibilityLabel\} per night/);
  assert.match(ratesSource, /const previewReserve = \(\) => undefined/);
  assert.match(ratesSource, /const reserveLabel = "Reserve"/);
  assert.match(ratesSource, /<TouchableOpacity[\s\S]*?onPress=\{previewReserve\}/);
  assert.match(styleRule(ratesSource, "actionControl", "actionControlText"), /minWidth: 82[\s\S]*minHeight: 44[\s\S]*borderRadius: 10/);
  assert.doesNotMatch(ratesSource, /onPress=\{\(\) => onSelectOffer\(row\.offerId\)\}/);
  assert.doesNotMatch(ratesSource, /Selected|>Select<|accessibilityRole="radio"/);
});

test("Rates preserves live offer identities for future provider activation", () => {
  assert.match(ratesSource, /offers\.find\(\(offer\) => offer\.kind === "internal-room-flow"\)/);
  assert.match(ratesSource, /offers\.find\(\(offer\) => offer\.kind === "provider-handoff"\)/);
  assert.match(ratesSource, /offerId: internalOffer\.id/);
  assert.match(ratesSource, /offerId: providerOffer\.id/);
});

test("Rates preserves loading and truthful empty states", () => {
  assert.match(ratesSource, /if \(detailsStatus === "loading"\) return null/);
  assert.match(ratesSource, /No reservable rates available/);
  assert.match(ratesSource, /Try updating your stay or check again later/);
});

test("Hotel Details removes its checkout-style bottom booking dock", () => {
  assert.doesNotMatch(detailSource, /estimated stay total|Continue booking|dockTotal|continueButton/);
  assert.match(detailSource, /contentContainerStyle=\{\{ paddingBottom: 24 \+ inset\.bottom \}\}/);
});

test("web reference remains unchanged while native Rates is independently aligned", () => {
  assert.match(webCompare, /offer\.providerLogoUrl/);
  assert.match(webCompare, /offer\.nightlyPrice/);
  assert.match(webContinuation, /providerLogoUrl: "\/brand\/kurioticket-logo-primary-light-bg\.svg"/);
  assert.match(webContinuation, /action: \{ kind: "internal-room-flow" \}/);
});
