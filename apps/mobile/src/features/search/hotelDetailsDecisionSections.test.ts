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

test("active Details combines location and related hotels in order from the enriched response", () => {
  const detail = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
  const booking = readFileSync("src/features/search/NativeHotelBookingDetails.tsx", "utf8");
  assert.ok(booking.indexOf("NativeHotelLocationSection") < booking.indexOf("NativeRelatedHotelsSection"));
  assert.match(detail, /hotels: details\?\.relatedHotels \?\? \[\]/);
  assert.match(detail, /<NativeHotelBookingDetails[\s\S]*?relatedHotels=\{relatedHotels\}/);
  assert.match(booking, /<NativeHotelLocationSection[\s\S]*?hotelId=\{result\.id\}[\s\S]*?hotelName=\{result\.name\}[\s\S]*?propertyDetails=\{property\}[\s\S]*?theme=\{theme\}/);
  assert.match(booking, /<NativeRelatedHotelsSection[\s\S]*?hotels=\{relatedHotels\}/);
  assert.doesNotMatch(detail, /travelApi\.hotels?Search/);
});

test("native Compare Property location uses its preview as the sole full-map launcher", () => {
  const component = readFileSync("src/features/search/NativeHotelDecisionSections.tsx", "utf8");
  const section = component.slice(
    component.indexOf("export function NativeHotelPropertyLocationSection"),
    component.indexOf("function RelatedHotelCard"),
  );
  const locationCard = component.match(/locationCard:\s*\{([^}]*)\}/)?.[1] ?? "";
  const mapFrame = component.match(/mapFrame:\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(section, /buildHotelAddress\(propertyDetails\)/);
  assert.match(section, /nativeHotelLocationPreviewUrl\(api\.baseUrl, hotelId\)/);
  assert.match(section, /<Image accessible=\{false\} source=\{\{ uri: mapUrl \}\} resizeMode="cover"/);
  assert.match(section, /onError=\{\(\) => setMapFailed\(true\)\}/);
  assert.match(section, /Map preview unavailable/);
  assert.equal(section.match(/onPress=\{openFullMap\}/g)?.length, 1);
  assert.match(section, /<Pressable accessibilityRole="button" accessibilityLabel=\{`Open full map for \$\{hotelName\}`\} accessibilityHint="Opens an interactive map inside Kurioticket" onPress=\{openFullMap\} style=\{\[styles\.mapFrame/);
  assert.match(section, /<NativeHotelFullMapModal visible=\{fullMapOpen\} hotelId=\{hotelId\} theme=\{theme\} onClose=\{\(\) => setFullMapOpen\(false\)\} propertyDetails=\{propertyDetails\} hotelName=\{hotelName\} \/>/);
  assert.doesNotMatch(section, />View in map</);
  assert.doesNotMatch(section, /styles\.mapAction|styles\.mapActionText/);
  assert.doesNotMatch(component, /mapAction:\s*\{|mapActionText:\s*\{/);
  assert.doesNotMatch(locationCard, /marginHorizontal:\s*-16|shadow|elevation/);
  assert.match(mapFrame, /height:\s*216/);
  assert.match(mapFrame, /width:\s*"100%"/);
  assert.match(mapFrame, /borderWidth:\s*StyleSheet\.hairlineWidth/);
  assert.match(mapFrame, /overflow:\s*"hidden"/);
  assert.doesNotMatch(mapFrame, /height:\s*280/);
  assert.match(mapFrame, /borderRadius:\s*14/);
  assert.match(component, /locationHeading:\s*\{[^}]*fontSize:\s*17[^}]*lineHeight:\s*22[^}]*fontWeight:\s*"700"[^}]*fontFamily:\s*appFonts\.bold/);
  assert.match(component, /address:\s*\{[^}]*marginTop:\s*4[^}]*fontSize:\s*13[^}]*lineHeight:\s*19[^}]*fontWeight:\s*"400"[^}]*fontFamily:\s*appFonts\.regular/);
});

test("native related hotel header aligns See all with the inset heading and opens full hotel results", () => {
  const component = readFileSync("src/features/search/NativeHotelDecisionSections.tsx", "utf8");
  const section = component.slice(
    component.indexOf("export function NativeRelatedHotelsSection"),
    component.indexOf("const styles = StyleSheet.create"),
  );
  const relatedSectionStyle = component.match(/relatedSection:\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(section, /<View style=\{styles\.relatedHeader\}>[\s\S]*?accessibilityRole="header"[\s\S]*?>See all<\/Text>/);
  assert.match(section, /accessibilityLabel=\{cityName \? `See all hotels in \$\{cityName\}` : "See all nearby hotels"\}/);
  assert.match(section, /router\.push\(\{[\s\S]*?pathname: "\/hotel-results"[\s\S]*?destination: cityName \|\| one\(params\.destination\) \|\| ""[\s\S]*?checkIn: one\(params\.checkIn\) \|\| ""[\s\S]*?checkOut: one\(params\.checkOut\) \|\| ""[\s\S]*?guests: one\(params\.guests\) \|\| "2"[\s\S]*?rooms: one\(params\.rooms\) \|\| "1"/);
  assert.match(section, /<ScrollView horizontal style=\{styles\.carouselViewport\} showsHorizontalScrollIndicator=\{false\}/);
  assert.doesNotMatch(relatedSectionStyle, /marginHorizontal/);
  assert.match(component, /relatedHeader:\s*\{[^}]*flexDirection:\s*"row"[^}]*alignItems:\s*"center"[^}]*justifyContent:\s*"space-between"[^}]*gap:\s*12/);
  assert.match(component, /carouselViewport:\s*\{[^}]*marginHorizontal:\s*-16[^}]*marginTop:\s*8/);
  assert.match(component, /carousel:\s*\{[^}]*gap:\s*12[^}]*paddingHorizontal:\s*16/);
});

test("native related Hotel cards use the measured compact carousel geometry and whole-card action", () => {
  const component = readFileSync("src/features/search/NativeHotelDecisionSections.tsx", "utf8");
  const card = component.slice(
    component.indexOf("function RelatedHotelCard"),
    component.indexOf("export function NativeRelatedHotelsSection"),
  );

  assert.match(component, /const RELATED_HOTEL_CARD_WIDTH = 241;/);
  assert.match(component, /relatedCardSlot:\s*\{\s*width:\s*RELATED_HOTEL_CARD_WIDTH\s*\}/);
  assert.match(component, /imageFrame:\s*\{[^}]*height:\s*160[^}]*width:\s*"100%"/);
  assert.match(component, /cardBody:\s*\{[^}]*minHeight:\s*143[^}]*paddingHorizontal:\s*14[^}]*paddingTop:\s*12[^}]*paddingBottom:\s*14/);
  assert.match(component, /relatedCard:\s*\{[^}]*borderWidth:\s*StyleSheet\.hairlineWidth[^}]*borderRadius:\s*10/);
  assert.match(component, /heading:\s*\{[^}]*fontSize:\s*18[^}]*lineHeight:\s*24[^}]*fontWeight:\s*"700"[^}]*fontFamily:\s*appFonts\.bold/);
  assert.match(component, /stars:\s*\{[^}]*color:\s*"#F59E0B"[^}]*fontSize:\s*12[^}]*lineHeight:\s*16[^}]*letterSpacing:\s*0\.96[^}]*fontWeight:\s*"400"[^}]*fontFamily:\s*appFonts\.regular/);
  assert.match(component, /hotelName:\s*\{[^}]*marginTop:\s*3[^}]*fontSize:\s*15[^}]*lineHeight:\s*20[^}]*fontWeight:\s*"600"[^}]*fontFamily:\s*appFonts\.semibold/);
  assert.match(component, /location:\s*\{[^}]*marginTop:\s*3[^}]*fontSize:\s*12[^}]*lineHeight:\s*18[^}]*fontWeight:\s*"400"[^}]*fontFamily:\s*appFonts\.regular/);
  assert.match(component, /priceBlock:\s*\{[^}]*marginTop:\s*"auto"[^}]*paddingTop:\s*10/);
  assert.match(component, /nightly:\s*\{[^}]*fontSize:\s*14[^}]*lineHeight:\s*20[^}]*fontWeight:\s*"600"[^}]*fontFamily:\s*appFonts\.semibold/);
  assert.match(component, /priceUnavailable:\s*\{[^}]*fontSize:\s*14[^}]*lineHeight:\s*20[^}]*fontWeight:\s*"600"[^}]*fontFamily:\s*appFonts\.semibold/);

  assert.match(card, /item\.classificationStars/);
  assert.match(card, /item\.displayPrices\?\.nightly/);
  assert.doesNotMatch(card, /estimated stay total|displayPrices\.total|View hotel<\/Text>|ArrowRight|viewRow|viewText/);
  assert.doesNotMatch(card, /item\.hotel\.(?:rating|reviewScore)/);
  assert.equal(card.match(/<Pressable\b/g)?.length, 1);
  assert.match(card, /accessibilityLabel=\{`View hotel \$\{item\.hotel\.name\}`\}[\s\S]*?onPress=\{\(\) => onView\(item\)\}/);
});
