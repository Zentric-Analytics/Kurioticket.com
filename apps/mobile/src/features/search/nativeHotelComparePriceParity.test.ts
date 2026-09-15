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

test("Rates groups supplied room options instead of fabricating inventory", () => {
  assert.match(ratesSource, /roomOptions\.forEach\(\(option\) =>/);
  assert.match(ratesSource, /roomGroupTitle\(option\.name\)/);
  assert.match(ratesSource, /option\.displayPrice\?\.total/);
  assert.match(ratesSource, /meaningfulRateMeta\(option, title\)/);
  assert.doesNotMatch(ratesSource, /STATIC_RATE_GROUPS|\$1,225|Standard Room, 1 Queen Bed/);
});

test("Kurioticket rows keep the bundled wordmark and existing app fonts", () => {
  assert.ok(existsSync("assets/kurioticket-logo-primary-light-bg.png"));
  assert.match(ratesSource, /providerKind === "kurioticket"[\s\S]*?<Image[\s\S]*?accessibilityLabel="Kurioticket"[\s\S]*?require\("\.\.\/\.\.\/\.\.\/assets\/kurioticket-logo-primary-light-bg\.png"\)/);
  assert.match(styleRule(ratesSource, "groupTitle", "groupCard"), /fontFamily: appFonts\.bold/);
  assert.match(styleRule(ratesSource, "rateTitle", "benefitList"), /fontFamily: appFonts\.bold/);
  assert.match(styleRule(ratesSource, "rateMeta", "rateActionColumn"), /fontFamily: appFonts\.regular/);
});

test("Rates follows the measured reference provider-card proportions", () => {
  assert.match(styleRule(ratesSource, "groupSection", "groupTitle"), /gap: 20/);
  assert.match(styleRule(ratesSource, "groupCard", "rateRow"), /overflow: "hidden"[\s\S]*borderWidth: 1[\s\S]*borderRadius: 14/);
  assert.match(styleRule(ratesSource, "rateRow", "rateCopy"), /minHeight: 134[\s\S]*paddingHorizontal: 16[\s\S]*paddingVertical: 20[\s\S]*gap: 12/);
  assert.match(styleRule(ratesSource, "brandLogo", "providerName"), /width: 88[\s\S]*height: 18[\s\S]*marginBottom: 8/);
  assert.match(styleRule(ratesSource, "benefitList", "rateMeta"), /marginTop: "auto"[\s\S]*paddingTop: 18[\s\S]*gap: 1/);
  assert.match(styleRule(ratesSource, "rateActionColumn", "price"), /width: 104[\s\S]*alignItems: "flex-end"[\s\S]*justifyContent: "flex-start"/);
  assert.match(ratesSource, /index > 0 && \{ borderTopColor: theme\.border, borderTopWidth: StyleSheet\.hairlineWidth \}/);
});

test("Rates shows stay prices without an inactive reservation control", () => {
  assert.match(ratesSource, /\$\{total\.accessibilityLabel\} stay price/);
  assert.doesNotMatch(ratesSource, /<Pressable|>Reserve<|reserveButton|onPress=\{\(\) => onSelectOffer/);
  assert.doesNotMatch(ratesSource, /Selected|>Select<|accessibilityRole="radio"|per night/);
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
