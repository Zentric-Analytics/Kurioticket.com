import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { PublicHotelPropertyDetails } from "../../../../../src/lib/types";
import {
  nativeHotelSecondaryLocation,
  nativeHotelStayFitFacts,
  nativeHotelLocationEmbedUrl,
  nativeHotelLocationPreviewUrl,
} from "./nativeHotelLocationModel";

const screen = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const bookingDetails = readFileSync("src/features/search/NativeHotelBookingDetails.tsx", "utf8");
const component = readFileSync("src/features/search/NativeHotelLocationSection.tsx", "utf8");
const model = readFileSync("src/features/search/nativeHotelLocationModel.ts", "utf8");
const compare = readFileSync("src/features/search/NativeHotelDecisionSections.tsx", "utf8");
const fullMapModal = readFileSync("src/features/search/NativeHotelFullMapModal.tsx", "utf8");

const fixture: PublicHotelPropertyDetails = {
  description: "",
  latitude: 48.845,
  longitude: 2.371,
  streetAddress: "8 Rue van Gogh, 75012 Paris",
  neighbourhood: "Gare de Lyon",
  city: "Paris",
  country: "France",
  businessSuitable: true,
  familySuitable: false,
  interestTags: ["city break", "business"],
  accessibility: ["Accessibility features should be confirmed directly with the property"],
};

function styleRule(source: string, name: string, nextName: string) {
  const start = source.indexOf(`  ${name}:`);
  const end = source.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return source.slice(start, end);
}

test("Location is rendered by the active native hotel booking details flow", () => {
  assert.match(screen, /import \{ NativeHotelBookingDetails \} from "\.\/NativeHotelBookingDetails";/);
  assert.match(screen, /activeHotelTab === "details"[\s\S]*?<NativeHotelBookingDetails/);
  assert.match(bookingDetails, /import \{ NativeHotelLocationSection \} from "\.\/NativeHotelLocationSection";/);
  assert.match(bookingDetails, /<NativeHotelLocationSection[\s\S]*?hotelId=\{result\.id\}/);
});

test("Location uses one horizontal padding owner with a dense booking-page vertical rhythm", () => {
  assert.match(styleRule(screen, "detailBody", "compareSection"), /paddingHorizontal: 16/);
  const section = styleRule(component, "locationSection", "heading");
  assert.match(section, /paddingVertical: 0/);
  assert.doesNotMatch(section, /paddingHorizontal/);
});

test("secondary address suppresses street duplicates and case-insensitive duplicates", () => {
  assert.equal(nativeHotelSecondaryLocation(fixture), "Gare de Lyon, France");
  assert.equal(nativeHotelSecondaryLocation({ ...fixture, streetAddress: "Main Street", neighbourhood: "CENTRE", city: "centre", country: "France" }), "CENTRE, France");
});

test("stay-fit facts follow the web factual contract", () => {
  assert.deepEqual(nativeHotelStayFitFacts(fixture), [
    "Gare de Lyon neighborhood",
    "Work-friendly property",
    "Accessibility details available",
  ]);
  assert.ok(nativeHotelStayFitFacts({ ...fixture, familySuitable: true }).includes("Family-friendly"));
  assert.ok(nativeHotelStayFitFacts({ ...fixture, interestTags: ["Art museums"] }).includes("Good for sightseeing"));
  assert.match(model, /sightseeing\|culture\|history\|art\|theatre/);
});

test("Location keeps all existing location facts in a flat one-column presentation", () => {
  for (const copy of ["Location", "Why this location works", "Location fit details are limited to the verified address and map.", "Map preview unavailable", "Street View"]) assert.match(component, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const duplicate of ["Accessibility and location details", "Confirm specific accessibility requirements with the property before travel."]) assert.doesNotMatch(component, new RegExp(duplicate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(component, /propertyDetails\.accessibility/);
  assert.match(component, /facts\.map\(\(fact\) => <View key=\{fact\} style=\{styles\.factRow\}>/);
  assert.doesNotMatch(component, /factChip|flexWrap: "wrap"/);
  for (const legacy of ["✓ city break", "✓ business", "Suited to business stays", "Suited to family stays", "interestTags?.map"]) assert.doesNotMatch(component, new RegExp(legacy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("Location uses the shared credential-free preview and preserves interactive Street View", () => {
  assert.equal(nativeHotelLocationPreviewUrl("https://staging.example.test/base", "hotel id"), "https://staging.example.test/api/mobile/v1/hotels/location-preview?id=hotel+id");
  assert.equal(nativeHotelLocationEmbedUrl("https://staging.example.test/base", "hotel id", "streetview"), "https://staging.example.test/api/mobile/v1/hotels/location-embed?id=hotel+id&view=streetview");
  assert.match(component, /nativeHotelLocationPreviewUrl\(api\.baseUrl, hotelId\)/);
  assert.match(compare, /nativeHotelLocationPreviewUrl\(api\.baseUrl, hotelId\)/);
  assert.match(component, /nativeHotelLocationEmbedUrl\(api\.baseUrl, hotelId, "streetview"\)/);
  assert.doesNotMatch(component, /nativeHotelLocationEmbedUrl\(api\.baseUrl, hotelId, "map"\)/);
  assert.match(component, /view === "map" \? <Pressable/);
  assert.match(component, /accessibilityRole="button" accessibilityLabel=\{`Open full map for \$\{hotelName\}`\} accessibilityHint="Opens an interactive map inside Kurioticket"/);
  assert.match(component, /<Image accessible=\{false\} source=\{\{ uri: previewUrl \}\} resizeMode="cover" onError=\{\(\) => setMapPreviewFailed\(true\)\}/);
  assert.match(component, /<NativeHotelFullMapModal visible=\{fullMapOpen\} hotelId=\{hotelId\} theme=\{theme\}/);
  assert.match(component, /<WebView key=\{`\$\{hotelId\}:streetview`\} source=\{\{ uri: streetViewUrl \}\}/);
  assert.match(component, /onError=\{\(\) => setStreetViewFailed\(true\)\}/);
  assert.match(component, /onHttpError=\{\(\) => setStreetViewFailed\(true\)\}/);
  assert.match(fullMapModal, /nativeHotelLocationEmbedUrl\(api\.baseUrl, hotelId, "map"\)/);
  assert.doesNotMatch(component + compare, />View in map</);
  assert.doesNotMatch(component, /ArrowRight/);
  for (const forbidden of ["EXPO_PUBLIC_GOOGLE", "NEXT_PUBLIC_GOOGLE", "google.com/maps/embed", "buildOpenStreetMapHotelMapEmbedUrl"]) assert.doesNotMatch(component + model, new RegExp(forbidden));
});

test("Location keeps booking-page typography while tightening only spacing", () => {
  for (const rule of [/fontSize: 18/, /lineHeight: 24/, /fontWeight: "700"/, /appFonts\.bold/]) assert.match(styleRule(component, "heading", "addressRow"), rule);
  for (const rule of [/width: 34/, /height: 34/, /borderRadius: 17/]) assert.match(styleRule(component, "pinCircle", "addressCopy"), rule);
  assert.match(component, /<MapPin accessible=\{false\} size=\{18\}/);
  for (const rule of [/fontSize: 13/, /lineHeight: 19/, /fontWeight: "500"/, /appFonts\.medium/]) assert.match(styleRule(component, "primaryAddress", "secondaryAddress"), rule);
  for (const rule of [/fontSize: 12/, /lineHeight: 18/, /appFonts\.regular/]) assert.match(styleRule(component, "secondaryAddress", "mapShell"), rule);
  assert.match(styleRule(component, "addressRow", "pinCircle"), /marginTop: 6/);
  assert.match(styleRule(component, "mapShell", "mapTabs"), /marginTop: 6/);
  assert.doesNotMatch(styleRule(component, "mapTabs", "mapTab"), /borderBottomWidth|borderBottomColor/);
  assert.match(styleRule(component, "mapTabs", "mapTab"), /minHeight: 38/);
  assert.match(styleRule(component, "mapViewport", "mapPreview"), /height: 190/);
  assert.match(styleRule(component, "subheading", "factList"), /marginTop: 10/);
  assert.match(styleRule(component, "factList", "factRow"), /marginTop: 4[^}]*gap: 3/);
  assert.match(styleRule(component, "factRow", "factBullet"), /flexDirection: "row"/);
  for (const rule of [/fontSize: 13/, /lineHeight: 20/, /fontWeight: "400"/, /appFonts\.regular/]) assert.match(styleRule(component, "factText", "fallbackText"), rule);
  assert.match(component, /fallbackText: \{[^}]*fontSize: 13[^}]*lineHeight: 20[^}]*fontWeight: "400"[^}]*fontFamily: appFonts\.regular/);
});

test("Decision-section headings preserve the refined supporting hierarchy", () => {
  const locationHeading = styleRule(compare, "locationHeading", "address");
  const address = styleRule(compare, "address", "mapFrame");
  const moreHotelsHeading = styleRule(compare, "heading", "locationCard");
  for (const rule of [/fontSize: 17/, /lineHeight: 22/, /fontWeight: "700"/, /appFonts\.bold/]) assert.match(locationHeading, rule);
  for (const rule of [/fontSize: 13/, /lineHeight: 19/, /fontWeight: "400"/, /appFonts\.regular/]) assert.match(address, rule);
  for (const rule of [/fontSize: 18/, /lineHeight: 24/, /fontWeight: "700"/, /appFonts\.bold/]) assert.match(moreHotelsHeading, rule);
});

test("Property location keeps its own preview size while active Details uses the denser preview", () => {
  assert.match(compare, /export function NativeHotelPropertyLocationSection/);
  assert.match(compare, /nativeHotelLocationPreviewUrl\(api\.baseUrl, hotelId\)/);
  assert.match(component, /nativeHotelLocationPreviewUrl\(api\.baseUrl, hotelId\)/);
  assert.match(styleRule(compare, "mapFrame", "map"), /height: 216/);
  assert.match(styleRule(component, "mapViewport", "mapPreview"), /height: 190/);
});
