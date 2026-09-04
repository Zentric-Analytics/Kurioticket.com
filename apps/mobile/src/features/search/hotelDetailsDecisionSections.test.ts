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
  assert.ok(compare.indexOf("disclosure") < compare.indexOf("NativeHotelPropertyLocationSection"));
  assert.ok(compare.indexOf("NativeHotelPropertyLocationSection") < compare.indexOf("NativeRelatedHotelsSection"));
  assert.match(detail, /hotels: details\?\.relatedHotels \?\? \[\]/);
  assert.match(detail, /propertyDetails=\{property\}/);
  assert.doesNotMatch(detail, /travelApi\.hotels?Search/);
});

test("native location uses shared map helpers and a non-interactive existing WebView", () => {
  const component = readFileSync("src/features/search/NativeHotelDecisionSections.tsx", "utf8");
  assert.match(component, /buildHotelAddress/);
  assert.match(component, /buildHotelDirectionsUrl/);
  assert.match(component, /buildOpenStreetMapHotelMapEmbedUrl/);
  assert.match(component, /from "react-native-webview"/);
  assert.match(component, /pointerEvents="none"/);
  assert.match(component, /scrollEnabled=\{false\}/);
  assert.doesNotMatch(component, /react-native-maps/);
  assert.match(component, /minHeight: 44/);
  assert.match(component, /horizontal showsHorizontalScrollIndicator=\{false\}/);
});
