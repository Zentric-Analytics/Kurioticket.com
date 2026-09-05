import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const detailSource = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
const hotel = detailSource.slice(
  detailSource.indexOf("function HotelDetail"),
  detailSource.indexOf("const detailIcons"),
);
const amenitySource = readFileSync("src/features/search/HotelCardAmenityList.tsx", "utf8");
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

test("native internal offer uses the accessible bundled Kurioticket wordmark", () => {
  assert.ok(existsSync("assets/kurioticket-logo-primary-light-bg.png"));
  assert.match(hotel, /internal \? \([\s\S]*?<Image[\s\S]*?accessible[\s\S]*?accessibilityLabel="Kurioticket"[\s\S]*?accessibilityIgnoresInvertColors[\s\S]*?require\("\.\.\/\.\.\/\.\.\/assets\/kurioticket-logo-primary-light-bg\.png"\)/);
  assert.match(styleRule(detailSource, "hotelOfferBrandLogo", "hotelOfferProvider"), /width: 136[\s\S]*height: 30/);
  assert.doesNotMatch(hotel, /Kurioticket room options|indicative planning choice|Room choices are planning inventory/);
});

test("native provider offer uses canonical inline amenity icons and web-like price rows", () => {
  assert.match(hotel, /<HotelOfferAmenityList amenities=\{result\.amenities\} color=\{theme\.textSecondary\} \/>/);
  assert.doesNotMatch(hotel, /result\.amenities\.slice\(0, 3\)\.join\(" · "\)/);
  assert.match(amenitySource, /buildHotelAmenityPresentation\(amenities, 3\)/);
  assert.match(amenitySource, /wifi: Wifi/);
  assert.match(amenitySource, /restaurant: UtensilsCrossed/);
  assert.match(amenitySource, /bar: Wine/);
  assert.match(styleRule(amenitySource, "offerList", "offerItem"), /flexDirection: "row"/);
  assert.match(hotel, /d\.hotelOfferPriceRow[\s\S]*?nightlyPrice\?\.formatted[\s\S]*?d\.hotelOfferBottom[\s\S]*?per night/);
});

test("native selection and booking behavior remain intact", () => {
  assert.match(hotel, /accessibilityRole="radio"/);
  assert.match(hotel, /accessibilityState=\{\{ selected \}\}/);
  assert.match(hotel, /borderColor: selected \? hotelAccent : theme\.border/);
  assert.match(hotel, /onPress=\{\(\) => setSelectedOfferId\(offer\.id\)\}/);
  assert.match(hotel, /selectedOffer\?\.kind === "internal-room-flow"[\s\S]*?setRoomsOpen\(true\)/);
  assert.match(hotel, /Linking\.openURL\(redirectUrl\)/);
});

test("web reference retains logo, canonical amenities, nightly price, and internal continuation", () => {
  assert.match(webCompare, /offer\.providerLogoUrl/);
  assert.match(webCompare, /<HotelAmenityList[\s\S]*?items=\{offer\.amenities \?\? \[\]\}/);
  assert.match(webCompare, /offer\.nightlyPrice/);
  assert.match(webCompare, /data-nightly-supporting-label/);
  assert.match(webContinuation, /providerLogoUrl: "\/brand\/kurioticket-logo-primary-light-bg\.svg"/);
  assert.match(webContinuation, /amenities: amenities\.slice\(0, 3\)/);
  assert.match(webContinuation, /action: \{ kind: "internal-room-flow" \}/);
});
