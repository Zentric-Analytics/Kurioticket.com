import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { PublicHotelResult } from "../../../../../src/lib/types";
import { prepareNativeRelatedHotels } from "./nativeHotelRelatedHotelsModel";

const hotel = (id: string, overrides: Partial<PublicHotelResult> = {}): PublicHotelResult => ({
  id, provider: "Kurioticket", name: `Hotel ${id}`, rating: 8,
  classificationStars: 4, reviewScore: 8, reviewScale: 10, reviewCount: 12,
  neighbourhood: "Oberkampf", location: "Paris", amenities: [], roomType: "Room",
  cancellationInfo: "Terms apply", valueScore: 1, travelConfidenceScore: 1,
  arrivalSuitabilityScore: 1, recommendationReasons: [], badges: [],
  pricePerNight: 100, totalPrice: 300, currency: "USD", ...overrides,
} as PublicHotelResult);

test("related hotels preserve backend order while excluding current, duplicates, and results beyond seven", () => {
  const prepared = prepareNativeRelatedHotels({
    hotels: [hotel("current"), hotel("a"), hotel("a"), ..."bcdefgh".split("").map((id) => hotel(id))],
    currentHotelId: "current", displayCurrency: "USD", rates: {},
  });
  assert.deepEqual(prepared.map(({ hotel: item }) => item.id), ["a", "b", "c", "d", "e", "f", "g"]);
});

test("related cards retain static internal-detail policy and classification truth", () => {
  const [prepared] = prepareNativeRelatedHotels({ hotels: [hotel("a", { classificationStars: undefined, rating: 5 })], currentHotelId: "current", displayCurrency: "USD", rates: {} });
  assert.equal(prepared.classificationStars, null);
  assert.equal(prepared.result.searchPolicy.source, "kurioticket-static-hotels");
  assert.equal(prepared.result.searchPolicy.bookable, false);
  assert.equal(prepared.result.searchPolicy.action.kind, "internal-detail");
  assert.equal(prepared.result.partnerRedirectUrl, undefined);
});

test("related pricing uses one effective currency and fails closed without conversion evidence", () => {
  const same = prepareNativeRelatedHotels({ hotels: [hotel("usd")], currentHotelId: "current", displayCurrency: "USD", rates: {} })[0];
  assert.equal(same.displayPrices?.nightly?.currency, "USD");
  assert.equal(same.displayPrices?.total?.currency, "USD");
  const converted = prepareNativeRelatedHotels({ hotels: [hotel("ngn")], currentHotelId: "current", displayCurrency: "NGN", rates: { USD: 1, NGN: 1500 } })[0];
  assert.equal(converted.displayPrices?.nightly?.formatted, "₦150,000.00");
  const jpy = prepareNativeRelatedHotels({ hotels: [hotel("jpy", { currency: "JPY", pricePerNight: 1234, totalPrice: 2468 })], currentHotelId: "current", displayCurrency: "JPY", rates: {} })[0];
  assert.equal(jpy.displayPrices?.nightly?.formatted, "¥1,234");
  const unsafe = prepareNativeRelatedHotels({ hotels: [hotel("unsafe")], currentHotelId: "current", displayCurrency: "NGN", rates: {} })[0];
  assert.equal(unsafe.displayPrices, null);
});

test("decision sections are compare-only, ordered, and use the enriched details response", () => {
  const detail = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
  const compare = detail.slice(detail.indexOf('activeHotelTab === "compare"'), detail.indexOf('activeHotelTab === "about"'));
  assert.ok(compare.indexOf("NativeHotelPropertyLocationSection") < compare.indexOf("NativeRelatedHotelsSection"));
  assert.match(detail, /hotels: details\?\.relatedHotels \?\? \[\]/);
  assert.match(detail, /propertyDetails=\{property\}/);
  assert.doesNotMatch(detail, /travelApi\.hotels?Search/);
});

test("native location matches the web card geometry while retaining the existing non-interactive map", () => {
  const component = readFileSync("src/features/search/NativeHotelDecisionSections.tsx", "utf8");
  const webMap = readFileSync("../../src/components/results/hotelDetails/HotelDetailsGoogleMap.tsx", "utf8");
  const locationCard = component.match(/locationCard:\s*\{([^}]*)\}/)?.[1] ?? "";
  const locationHeader = component.match(/locationHeader:\s*\{([^}]*)\}/)?.[1] ?? "";
  const mapFrame = component.match(/mapFrame:\s*\{([^}]*)\}/)?.[1] ?? "";
  const mapViewport = component.match(/mapViewport:\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(component, /buildHotelAddress/);
  assert.match(component, /buildHotelDirectionsUrl/);
  assert.match(component, /buildOpenStreetMapHotelMapEmbedUrl/);
  assert.match(component, /from "react-native-webview"/);
  assert.match(component, /pointerEvents="none"/);
  assert.match(component, /scrollEnabled=\{false\}/);
  assert.doesNotMatch(component, /react-native-maps/);
  assert.match(locationCard, /borderRadius:\s*16/);
  assert.match(locationCard, /overflow:\s*"hidden"/);
  assert.doesNotMatch(locationCard, /padding:\s*16|gap:/);
  assert.match(locationHeader, /paddingHorizontal:\s*16/);
  assert.match(locationHeader, /paddingTop:\s*16/);
  assert.match(mapFrame, /height:\s*280/);
  assert.match(mapFrame, /width:\s*"100%"/);
  assert.doesNotMatch(mapViewport, /borderRadius|margin/);
  assert.match(component, /locationHeading:\s*\{[^}]*fontSize:\s*18[^}]*fontWeight:\s*"800"/);
  assert.match(component, /address:\s*\{[^}]*fontSize:\s*14[^}]*lineHeight:\s*20/);
  assert.match(webMap, /overflow-hidden[^"`]*rounded-2xl|rounded-2xl[^"`]*overflow-hidden/);
  assert.match(webMap, /className="px-4 py-4 sm:px-5"/);
  assert.match(webMap, /"h-\[280px\] w-full border-0/);
  assert.match(component, /<ScrollView horizontal[^>]*showsHorizontalScrollIndicator=\{false\}/);
});

test("native related hotel heading stays inset while only the horizontal carousel breaks out", () => {
  const component = readFileSync("src/features/search/NativeHotelDecisionSections.tsx", "utf8");
  const section = component.slice(
    component.indexOf("export function NativeRelatedHotelsSection"),
    component.indexOf("const styles = StyleSheet.create"),
  );
  const relatedSectionStyle = component.match(/relatedSection:\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.ok(section.indexOf('accessibilityRole="header"') < section.indexOf("<ScrollView"));
  assert.match(section, /<ScrollView horizontal style=\{styles\.carouselViewport\} showsHorizontalScrollIndicator=\{false\}/);
  assert.doesNotMatch(relatedSectionStyle, /marginHorizontal/);
  assert.match(component, /carouselViewport:\s*\{\s*marginHorizontal:\s*-16\s*\}/);
  assert.match(component, /carousel:\s*\{[^}]*paddingHorizontal:\s*16/);
  assert.match(component, /Math\.min\(300, Math\.max\(240, width \* 0\.82\)\)/);
});

test("native Open in Maps is a compact accessible overlay instead of a filled CTA", () => {
  const component = readFileSync("src/features/search/NativeHotelDecisionSections.tsx", "utf8");
  const mapsControl = component.match(/mapsControl:\s*\{([^}]*)\}/)?.[1] ?? "";
  const mapsOverlay = component.match(/mapsOverlay:\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(component, /import \{ colors \} from "\.\.\/\.\.\/theme\/tokens";/);
  assert.match(component, /ExternalLink/);
  assert.match(component, /accessibilityRole="link" accessibilityLabel=\{`Open \$\{hotelName\} in Maps`\}/);
  assert.match(component, /buildHotelDirectionsUrl/);
  assert.match(component, /Linking\.openURL\(directionsUrl\)/);
  assert.match(component, />Open in Maps<\/Text>/);
  assert.match(mapsControl, /minHeight:\s*44/);
  assert.doesNotMatch(mapsControl, /backgroundColor:\s*colors\.blue/);
  assert.match(mapsOverlay, /position:\s*"absolute"/);
  assert.match(mapsOverlay, /top:\s*12/);
  assert.match(mapsOverlay, /left:\s*12/);
  assert.doesNotMatch(component, /mapsButton|mapsButtonText/);
  assert.doesNotMatch(component, /#004BB8/i);
});
