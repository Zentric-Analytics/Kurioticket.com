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
  assert.match(detail, /<NativeHotelPropertyLocationSection[\s\S]*?hotelId=\{result\.id\}[\s\S]*?hotelName=\{result\.name\}[\s\S]*?propertyDetails=\{property\}[\s\S]*?theme=\{theme\}/);
  assert.doesNotMatch(detail, /travelApi\.hotels?Search/);
});

test("native Compare location reuses the secure interactive Google embed with web card geometry", () => {
  const component = readFileSync("src/features/search/NativeHotelDecisionSections.tsx", "utf8");
  const section = component.slice(
    component.indexOf("export function NativeHotelPropertyLocationSection"),
    component.indexOf("function RelatedHotelCard"),
  );
  const webMap = readFileSync("../../src/components/results/hotelDetails/HotelDetailsGoogleMap.tsx", "utf8");
  const locationCard = component.slice(component.indexOf("  locationCard:"), component.indexOf("  locationHeader:"));
  const locationHeader = component.match(/locationHeader:\s*\{([^}]*)\}/)?.[1] ?? "";
  const mapFrame = component.match(/mapFrame:\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(section, /hotelId:\s*string/);
  assert.match(component, /Platform/);
  assert.match(component, /getApiBaseUrl/);
  assert.match(component, /nativeHotelLocationEmbedUrl/);
  assert.match(section, /getApiBaseUrl\(Platform\.OS, __DEV__\)/);
  assert.match(section, /nativeHotelLocationEmbedUrl\(api\.baseUrl, hotelId, "map"\)/);
  assert.match(section, /<WebView/);
  assert.match(section, /key=\{`\$\{hotelId\}:compare-map`\}/);
  assert.match(section, /scrollEnabled=\{false\}/);
  assert.match(section, /onError=/);
  assert.match(section, /onHttpError=/);
  assert.match(section, /Map preview unavailable/);
  for (const forbidden of ["buildOpenStreetMapHotelMapEmbedUrl", 'pointerEvents="none"', ">Open in Maps</Text>", "Linking.openURL", "ExternalLink", "EXPO_PUBLIC_GOOGLE", "NEXT_PUBLIC_GOOGLE", "google.com/maps/embed"]) {
    assert.doesNotMatch(section, new RegExp(forbidden));
  }
  assert.match(locationCard, /marginTop:\s*24/);
  assert.match(locationCard, /marginHorizontal:\s*-16/);
  assert.match(locationCard, /borderWidth:\s*1/);
  assert.match(locationCard, /borderRadius:\s*16/);
  assert.match(locationCard, /overflow:\s*"hidden"/);
  assert.match(locationCard, /shadowColor:\s*"#0F172A"/);
  assert.match(locationCard, /shadowOffset:\s*\{ width:\s*0, height:\s*8/);
  assert.match(locationCard, /shadowOpacity:\s*0\.05/);
  assert.match(locationCard, /shadowRadius:\s*15/);
  assert.match(locationCard, /elevation:\s*2/);
  assert.match(locationHeader, /paddingHorizontal:\s*16/);
  assert.match(locationHeader, /paddingVertical:\s*16/);
  assert.match(mapFrame, /height:\s*280/);
  assert.match(mapFrame, /width:\s*"100%"/);
  assert.match(component, /locationHeading:\s*\{[^}]*fontSize:\s*18[^}]*lineHeight:\s*24[^}]*fontWeight:\s*"800"[^}]*fontFamily:\s*appFonts\.extraBold/);
  assert.match(component, /address:\s*\{[^}]*marginTop:\s*4[^}]*fontSize:\s*14[^}]*lineHeight:\s*20[^}]*fontWeight:\s*"400"[^}]*fontFamily:\s*appFonts\.regular/);
  for (const contract of ["rounded-2xl", "border-slate-200", "bg-white", "shadow-[0_8px_30px_rgba(15,23,42,0.05)]", "px-4 py-4", "h-[280px]", "buildGoogleHotelMapEmbedUrl"]) assert.ok(webMap.includes(contract), contract);
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

test("native related Hotel cards mirror the web text hierarchy and action treatment", () => {
  const component = readFileSync("src/features/search/NativeHotelDecisionSections.tsx", "utf8");
  const web = readFileSync("../../src/components/results/hotelDetails/RelatedHotelsSection.tsx", "utf8");
  const card = component.slice(
    component.indexOf("function RelatedHotelCard"),
    component.indexOf("export function NativeRelatedHotelsSection"),
  );

  for (const contract of [
    "w-[82vw]", "max-w-[300px]", "aspect-video", "min-h-[174px]", "p-3",
    "text-xs tracking-[0.08em] text-amber-500",
    "text-[15px] font-bold leading-5", "text-xs leading-5", "text-sm font-bold",
    "mt-1 text-xs", "mt-2.5", "min-h-11", "border-t", "pt-2.5",
    "text-sm font-bold text-blue", 'className="h-4 w-4"',
  ]) assert.ok(web.includes(contract), contract);

  assert.match(component, /import \{ appFonts \} from "\.\.\/\.\.\/theme\/typography";/);
  assert.match(component, /cardBody:\s*\{\s*minHeight:\s*174,\s*padding:\s*12\s*\}/);
  assert.doesNotMatch(component, /cardBody:\s*\{[^}]*minHeight:\s*190|cardBody:\s*\{[^}]*padding:\s*13/);
  assert.match(component, /stars:\s*\{[^}]*color:\s*"#F59E0B"[^}]*fontSize:\s*12[^}]*lineHeight:\s*16[^}]*letterSpacing:\s*0\.96[^}]*fontWeight:\s*"400"[^}]*fontFamily:\s*appFonts\.regular/);
  assert.match(component, /hotelName:\s*\{[^}]*marginTop:\s*4[^}]*fontSize:\s*15[^}]*lineHeight:\s*20[^}]*fontWeight:\s*"700"[^}]*fontFamily:\s*appFonts\.bold/);
  assert.match(component, /location:\s*\{[^}]*marginTop:\s*4[^}]*fontSize:\s*12[^}]*lineHeight:\s*20[^}]*fontWeight:\s*"400"[^}]*fontFamily:\s*appFonts\.regular/);
  assert.match(component, /priceBlock:\s*\{[^}]*marginTop:\s*"auto"[^}]*paddingTop:\s*12[^}]*gap:\s*4/);
  assert.match(component, /nightly:\s*\{[^}]*fontSize:\s*14[^}]*lineHeight:\s*20[^}]*fontWeight:\s*"700"[^}]*fontFamily:\s*appFonts\.bold/);
  assert.match(component, /total:\s*\{[^}]*fontSize:\s*12[^}]*lineHeight:\s*16[^}]*fontWeight:\s*"400"[^}]*fontFamily:\s*appFonts\.regular/);
  assert.match(component, /priceUnavailable:\s*\{[^}]*fontSize:\s*14[^}]*lineHeight:\s*20[^}]*fontWeight:\s*"600"[^}]*fontFamily:\s*appFonts\.semibold/);
  assert.match(component, /viewText:\s*\{[^}]*fontSize:\s*14[^}]*lineHeight:\s*20[^}]*fontWeight:\s*"700"[^}]*fontFamily:\s*appFonts\.bold/);
  assert.match(component, /viewRow:\s*\{[^}]*minHeight:\s*44[^}]*marginTop:\s*10[^}]*paddingTop:\s*10[^}]*borderTopWidth:\s*StyleSheet\.hairlineWidth[^}]*flexDirection:\s*"row"[^}]*alignItems:\s*"center"[^}]*justifyContent:\s*"space-between"/);

  assert.match(card, /const relatedActionColor = theme\.dark \? "#8FB5FF" : colors\.blue;/);
  assert.match(card, /styles\.viewText, \{ color: relatedActionColor \}/);
  assert.match(card, /<ArrowRight accessible=\{false\} size=\{16\} color=\{relatedActionColor\} \/>/);
  assert.doesNotMatch(card, /styles\.viewText, \{ color: theme\.textPrimary \}/);
  assert.doesNotMatch(card, /<ArrowRight[^>]*(?:size=\{17\}|color=\{theme\.icon\})/);
  assert.match(card, /item\.classificationStars/);
  assert.doesNotMatch(card, /item\.hotel\.(?:rating|reviewScore)/);
  assert.equal(card.match(/<Pressable\b/g)?.length, 1);
  assert.match(card, /<Pressable accessibilityRole="button" accessibilityLabel=\{`View hotel \$\{item\.hotel\.name\}`\} onPress=\{\(\) => onView\(item\)\}/);
});
