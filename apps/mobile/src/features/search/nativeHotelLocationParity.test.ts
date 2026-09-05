import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { PublicHotelPropertyDetails } from "../../../../../src/lib/types";
import {
  nativeHotelSecondaryLocation,
  nativeHotelStayFitFacts,
} from "./nativeHotelLocationModel";

const screen = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
const component = readFileSync("src/features/search/NativeHotelLocationSection.tsx", "utf8");
const model = readFileSync("src/features/search/nativeHotelLocationModel.ts", "utf8");
const compare = readFileSync("src/features/search/NativeHotelDecisionSections.tsx", "utf8");

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

test("Location component is explicitly imported and rendered by Hotel Details", () => {
  assert.match(screen, /import \{ NativeHotelLocationSection \} from "\.\/NativeHotelLocationSection";/);
  assert.match(screen, /activeHotelTab === "location"[\s\S]*?<NativeHotelLocationSection/);
});

test("Location uses one horizontal padding owner", () => {
  assert.match(styleRule(screen, "hotelDetailBody", "hotelOffer"), /paddingHorizontal: 16/);
  const section = styleRule(component, "locationSection", "heading");
  assert.match(section, /paddingVertical: 12/);
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
  for (const copy of ["Location &amp; stay fit", "Why this location works", "Accessibility and location details", "Location fit details are limited to the verified address and map.", "Confirm specific accessibility requirements with the property before travel.", "Open in Maps", "Map preview unavailable"]) assert.match(component, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const legacy of ["✓ city break", "✓ business", "Suited to business stays", "Suited to family stays", "interestTags?.map"]) assert.doesNotMatch(component, new RegExp(legacy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("Location uses trusted map builders without credentials or fake Street View", () => {
  assert.match(component, /buildOpenStreetMapHotelMapEmbedUrl\(propertyDetails\)/);
  assert.match(component, /buildHotelDirectionsUrl\(\{ hotelName, propertyDetails \}\)/);
  for (const forbidden of ["EXPO_PUBLIC_GOOGLE", "GOOGLE_MAPS_API_KEY", "google.com/maps/search", "google.com/maps/dir", "Street View"]) assert.doesNotMatch(component, new RegExp(forbidden));
  assert.match(component, /onError=\{\(\) => setMapFailed\(true\)\}/);
  assert.match(component, /onHttpError=\{\(\) => setMapFailed\(true\)\}/);
});

test("Location visual contracts match mobile web", () => {
  for (const rule of [/fontSize: 20/, /lineHeight: 28/, /appFonts\.extraBold/]) assert.match(styleRule(component, "heading", "addressRow"), rule);
  for (const rule of [/width: 36/, /height: 36/, /borderRadius: 18/]) assert.match(styleRule(component, "pinCircle", "addressCopy"), rule);
  assert.match(component, /<MapPin accessible=\{false\} size=\{18\}/);
  for (const rule of [/fontSize: 13/, /lineHeight: 20/, /appFonts\.semibold/]) assert.match(styleRule(component, "primaryAddress", "secondaryAddress"), rule);
  for (const rule of [/fontSize: 12/, /lineHeight: 20/, /appFonts\.regular/]) assert.match(styleRule(component, "secondaryAddress", "mapCard"), rule);
  for (const rule of [/marginTop: 16/, /borderRadius: 14/, /borderWidth: 1/]) assert.match(styleRule(component, "mapCard", "mapViewport"), rule);
  assert.match(styleRule(component, "mapViewport", "map"), /height: 200/);
  for (const rule of [/fontSize: 16/, /lineHeight: 24/, /appFonts\.bold/]) assert.match(styleRule(component, "subheading", "factList"), rule);
  for (const rule of [/borderRadius: 8/, /paddingHorizontal: 12/, /paddingVertical: 8/]) assert.match(styleRule(component, "factChip", "factText"), rule);
  for (const rule of [/fontSize: 12/, /lineHeight: 16/, /appFonts\.semibold/]) assert.match(styleRule(component, "factText", "accessibilityHeading"), rule);
  assert.match(styleRule(component, "accessibilityRow", "accessibilityBullet"), /alignItems: "flex-start"/);
  assert.match(styleRule(component, "accessibilityBullet", "accessibilityText"), /width: 20[\s\S]*lineHeight: 24/);
  assert.match(styleRule(component, "accessibilityText", "accessibilityFallback"), /fontSize: 14[\s\S]*lineHeight: 24/);
});

test("Compare Property location remains independently unchanged", () => {
  assert.match(compare, /export function NativeHotelPropertyLocationSection/);
  assert.match(styleRule(compare, "mapFrame", "mapViewport"), /height: 280/);
});
