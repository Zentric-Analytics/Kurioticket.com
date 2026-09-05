import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { PublicHotelPropertyDetails } from "../../../../../src/lib/types";
import {
  nativeHotelSecondaryLocation,
  nativeHotelStayFitFacts,
} from "./nativeHotelLocationModel";

const source = readFileSync("src/features/search/NativeHotelLocationSection.tsx", "utf8");
const modelSource = readFileSync("src/features/search/nativeHotelLocationModel.ts", "utf8");
const detailSource = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
const compareSource = readFileSync("src/features/search/NativeHotelDecisionSections.tsx", "utf8");

const citizenM: PublicHotelPropertyDetails = {
  description: "",
  latitude: 48.8449,
  longitude: 2.3718,
  streetAddress: "8 Rue van Gogh, 75012 Paris",
  neighbourhood: "Gare de Lyon",
  city: "Paris",
  country: "France",
  businessSuitable: true,
  accessibility: [
    "Accessibility features should be confirmed directly with the property",
  ],
  interestTags: ["city break", "business"],
};

function styleRule(name: string, nextName: string) {
  const start = source.indexOf(`  ${name}:`);
  const end = source.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return source.slice(start, end);
}

test("native Location splits and deduplicates the verified address like web", () => {
  assert.equal(citizenM.streetAddress, "8 Rue van Gogh, 75012 Paris");
  assert.equal(nativeHotelSecondaryLocation(citizenM), "Gare de Lyon, France");
  assert.match(source, /propertyDetails\.streetAddress\.trim\(\)/);
  assert.match(modelSource, /candidate\.toLocaleLowerCase\(\) === part\.toLocaleLowerCase\(\)/);
});

test("native Location derives only the web stay-fit facts", () => {
  assert.deepEqual(nativeHotelStayFitFacts(citizenM), [
    "Gare de Lyon neighborhood",
    "Work-friendly property",
    "Accessibility details available",
  ]);
  assert.deepEqual(nativeHotelStayFitFacts({
    ...citizenM,
    neighbourhood: "",
    businessSuitable: false,
    familySuitable: true,
    accessibility: [],
    interestTags: ["Art museums"],
  }), ["Family-friendly", "Good for sightseeing"]);
  assert.match(modelSource, /sightseeing\|culture\|history\|art\|theatre\/i/);
  assert.doesNotMatch(modelSource, /interestTags\?\.map/);
  for (const oldCopy of ["✓ city break", "✓ business", "Suited to business stays", "Suited to family stays"]) {
    assert.doesNotMatch(source, new RegExp(oldCopy));
    assert.doesNotMatch(detailSource, new RegExp(oldCopy));
  }
});

test("native Location owns the exact web headings, fallbacks, and list treatment", () => {
  for (const copy of [
    "Location &amp; stay fit",
    "Why this location works",
    "Accessibility and location details",
    "Location fit details are limited to the verified address and map.",
    "Confirm specific accessibility requirements with the property before travel.",
    "Open in Maps",
  ]) assert.match(source, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(source, /accessibilityDetails\.map\(\(detail, index\)/);
  assert.match(source, /locationAccessibilityBullet/);
  assert.match(source, /locationAccessibilityText: \{ flex: 1/);
  assert.match(source, /locationFacts: \{[^\n]*flexWrap: "wrap"[^\n]*gap: 8/);
});

test("native Location matches the meaningful mobile-web geometry", () => {
  assert.match(styleRule("locationHeading", "locationAddressRow"), /fontSize: 20[^\n]*lineHeight: 28[^\n]*appFonts\.extraBold/);
  assert.match(styleRule("locationPinCircle", "locationAddressCopy"), /width: 36[^\n]*height: 36[^\n]*borderRadius: 18/);
  assert.match(source, /<MapPin accessible=\{false\} size=\{18\}/);
  assert.match(styleRule("locationStreetAddress", "locationSecondaryAddress"), /fontSize: 13[^\n]*lineHeight: 20[^\n]*appFonts\.semibold/);
  assert.match(styleRule("locationSecondaryAddress", "locationMapCard"), /fontSize: 12[^\n]*lineHeight: 20[^\n]*appFonts\.regular/);
  assert.match(styleRule("locationMapCard", "locationMapViewport"), /marginTop: 16[^\n]*borderRadius: 14[^\n]*borderWidth: 1/);
  assert.match(styleRule("locationMapViewport", "locationMap"), /height: 200/);
  assert.match(styleRule("locationSubheading", "locationFacts"), /fontSize: 16[^\n]*lineHeight: 24[^\n]*appFonts\.bold/);
  assert.match(styleRule("locationFactChip", "locationFactText"), /borderRadius: 8[^\n]*paddingHorizontal: 12[^\n]*paddingVertical: 8/);
});

test("native Location uses trusted map builders without claiming Street View", () => {
  assert.match(source, /buildOpenStreetMapHotelMapEmbedUrl\(propertyDetails\)/);
  assert.match(source, /buildHotelDirectionsUrl\(\{ hotelName, propertyDetails \}\)/);
  assert.match(source, /onError=\{\(\) => setMapFailed\(true\)\}/);
  assert.doesNotMatch(source, /Street View|GOOGLE_MAPS|EXPO_PUBLIC/);
  assert.doesNotMatch(source, /google\.com\/maps\/search|google\.com\/maps\/dir/);
  assert.match(detailSource, /activeHotelTab === "location"[\s\S]*?<NativeHotelLocationSection/);
  assert.doesNotMatch(detailSource.slice(detailSource.indexOf('activeHotelTab === "location"'), detailSource.indexOf('activeHotelTab === "reviews"')), /mapsButton|distanceFromCenter|interestTags/);
  assert.match(compareSource, /function NativeHotelPropertyLocationSection/);
  assert.match(compareSource, /height: 280/);
});
