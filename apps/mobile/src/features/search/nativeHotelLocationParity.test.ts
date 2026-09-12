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

const screen = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
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

test("Location component is explicitly imported and rendered inside Hotel Details", () => {
  assert.match(screen, /import \{ NativeHotelLocationSection \} from "\.\/NativeHotelLocationSection";/);
  assert.match(screen, /activeHotelTab === "details"[\s\S]*?<NativeHotelLocationSection/);
  assert.match(screen, /hotelId=\{result\.id\}/);
});

test("Location uses one horizontal padding owner with compact vertical rhythm", () => {
  assert.match(styleRule(screen, "hotelDetailBody", "hotelOffer"), /paddingHorizontal: 16/);
  const section = styleRule(component, "locationSection", "heading");
  assert.match(section, /paddingVertical: 8/);
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

test("Location owns exact parity and fallback copy without legacy presentation", () => {
  for (const copy of ["Location &amp; stay fit", "Why this location works", "Accessibility and location details", "Location fit details are limited to the verified address and map.", "Confirm specific accessibility requirements with the property before travel.", "Map preview unavailable", "Street View"]) assert.match(component, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
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

test("Location keeps mobile web typography while using compact native spacing", () => {
  for (const rule of [/fontSize: 18/, /lineHeight: 24/, /fontWeight: "700"/, /appFonts\.bold/]) assert.match(styleRule(component, "heading", "addressRow"), rule);
  for (const rule of [/width: 36/, /height: 36/, /borderRadius: 18/]) assert.match(styleRule(component, "pinCircle", "addressCopy"), rule);
  assert.match(component, /<MapPin accessible=\{false\} size=\{18\}/);
  for (const rule of [/fontSize: 13/, /lineHeight: 19/, /fontWeight: "500"/, /appFonts\.medium/]) assert.match(styleRule(component, "primaryAddress", "secondaryAddress"), rule);
  for (const rule of [/fontSize: 12/, /lineHeight: 18/, /appFonts\.regular/]) assert.match(styleRule(component, "secondaryAddress", "mapCard"), rule);
  for (const rule of [/marginTop: 12/, /borderRadius: 14/, /borderWidth: 1/]) assert.match(styleRule(component, "mapCard", "mapTabs"), rule);
  assert.match(styleRule(component, "mapViewport", "mapPreview"), /height: 216/);
  assert.doesNotMatch(styleRule(component, "mapViewport", "mapPreview"), /height: (?:280|300)/);
  for (const rule of [/marginTop: 22/, /fontSize: 15/, /lineHeight: 22/, /fontWeight: "600"/, /appFonts\.semibold/]) assert.match(styleRule(component, "subheading", "factList"), rule);
  for (const rule of [/borderRadius: 8/, /paddingHorizontal: 12/, /paddingVertical: 6/]) assert.match(styleRule(component, "factChip", "factText"), rule);
  for (const rule of [/fontSize: 12/, /lineHeight: 16/, /fontWeight: "500"/, /appFonts\.medium/]) assert.match(styleRule(component, "factText", "accessibilityHeading"), rule);
  assert.match(styleRule(component, "accessibilityHeading", "accessibilityList"), /marginTop: 22/);
  assert.match(styleRule(component, "accessibilityRow", "accessibilityBullet"), /alignItems: "flex-start"/);
  assert.match(styleRule(component, "accessibilityBullet", "accessibilityText"), /width: 20[\s\S]*lineHeight: 24/);
  assert.match(styleRule(component, "accessibilityText", "accessibilityFallback"), /fontSize: 13[\s\S]*lineHeight: 22/);
});

test("Decision-section headings preserve the refined supporting hierarchy", () => {
  const locationHeading = styleRule(compare, "locationHeading", "address");
  const address = styleRule(compare, "address", "mapFrame");
  const moreHotelsHeading = styleRule(compare, "heading", "locationCard");
  for (const rule of [/fontSize: 17/, /lineHeight: 22/, /fontWeight: "700"/, /appFonts\.bold/]) assert.match(locationHeading, rule);
  for (const rule of [/fontSize: 13/, /lineHeight: 19/, /fontWeight: "400"/, /appFonts\.regular/]) assert.match(address, rule);
  for (const rule of [/fontSize: 18/, /lineHeight: 24/, /fontWeight: "700"/, /appFonts\.bold/]) assert.match(moreHotelsHeading, rule);
});

test("Property location and full Details location share the compact preview contract", () => {
  assert.match(compare, /export function NativeHotelPropertyLocationSection/);
  assert.match(compare, /nativeHotelLocationPreviewUrl\(api\.baseUrl, hotelId\)/);
  assert.match(component, /nativeHotelLocationPreviewUrl\(api\.baseUrl, hotelId\)/);
  assert.match(styleRule(compare, "mapFrame", "map"), /height: 216/);
  assert.doesNotMatch(styleRule(compare, "mapFrame", "map"), /height: 280/);
});