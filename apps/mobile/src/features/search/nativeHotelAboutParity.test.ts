import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildHotelAmenityPresentation } from "../../../../../src/components/results/hotelAmenityPresentation";
import { nativeHotelAmenityLabel } from "./hotelAmenityLabel";

const source = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
const hotel = source.slice(source.indexOf("function HotelDetail"), source.indexOf("const detailIcons"));
const details = hotel.slice(hotel.indexOf('activeHotelTab === "details"'), hotel.indexOf('activeHotelTab === "reviews"'));
const web = readFileSync("../../src/components/results/hotelDetails/HotelAboutSection.tsx", "utf8");
const amenityLabelSource = readFileSync("src/features/search/hotelAmenityLabel.ts", "utf8");

function styleRule(name: string, nextName: string) {
  const start = source.indexOf(`  ${name}:`);
  const end = source.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return source.slice(start, end);
}

const escaped = (copy: string) => new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

test("native Details derives the same semantic amenity presentation as web About", () => {
  assert.match(hotel, /buildHotelAmenityPresentation\([\s\S]*?result\.amenities,[\s\S]*?result\.amenities\.length/);
  assert.doesNotMatch(hotel, /const highlights = result\.amenities\.slice/);
  assert.doesNotMatch(details, /<Check\b/);
  for (const icon of ["Wifi", "UtensilsCrossed", "Laptop", "Wine", "Bed", "Sparkles", "Award"]) {
    assert.match(source, new RegExp(`\\b${icon}\\b`));
    assert.match(web, new RegExp(`\\b${icon}\\b`));
  }

  const items = buildHotelAmenityPresentation(["Wi-Fi", "Restaurant", "Bar", "Workspaces"], 4)
    .map((item) => ({ ...item, label: nativeHotelAmenityLabel(item) }));
  assert.deepEqual(items.map(({ label }) => label), ["Free Wi-Fi", "Restaurant", "Bar", "Workspaces"]);
  assert.deepEqual(items.map(({ iconKey }) => iconKey), ["wifi", "restaurant", "bar", "generic"]);
  assert.match(amenityLabelSource, /translationKey === "hotelResults\.filter\.freeWifi"[\s\S]*?"Free Wi-Fi"/);
  assert.match(source, /\/bar\|lounge\/i[\s\S]*?return Wine/);
  assert.match(source, /return Sparkles/);
});

test("native Details preserves the exact web About fallback copy and removes stale native copy", () => {
  for (const copy of [
    "A property description is not available yet.", "Property highlights are not available yet.",
    "All available amenities are shown in Property highlights.", "Room details are confirmed when you choose a room.",
    "Hotel classification is not available.", "Specific accessibility features should be confirmed before booking.",
  ]) { assert.match(details, escaped(copy)); assert.match(web, escaped(copy)); }
  for (const stale of ["No additional verified amenities are listed.", "Verified property highlights are not available yet.", "Property type and classification are not available."]) assert.doesNotMatch(details, escaped(stale));
});

test("native Details renders room, hotel information, and accessibility row by row", () => {
  assert.doesNotMatch(details, /\.join\(" · "\)/);
  assert.match(details, /\[property\?\.roomSummary, property\?\.bedSummary\][\s\S]*?\.map[\s\S]*?<Bed accessible=\{false\} size=\{18\}/);
  assert.match(details, /property\?\.propertyType[\s\S]*?<Award accessible=\{false\} size=\{18\}/);
  assert.match(details, /classification \? `\$\{classification\}-star classification` : "Hotel classification is not available\."/);
  assert.match(details, /property\.accessibility\.map\([\s\S]*?hotelAboutAccessibilityItem[\s\S]*?>•<\/Text>/);
});

test("native Details keeps web About typography and compact mobile rhythm", () => {
  const heading = styleRule("hotelAboutHeading", "hotelAboutDescription");
  const description = styleRule("hotelAboutDescription", "hotelAboutSubheading");
  const subheading = styleRule("hotelAboutSubheading", "hotelAboutFallback");
  const highlight = styleRule("hotelAboutHighlight", "hotelAboutHighlightText");
  const highlightText = styleRule("hotelAboutHighlightText", "hotelAboutList");
  const infoText = styleRule("hotelAboutInfoText", "hotelAboutAccessibilityList");
  const accessibilityText = styleRule("hotelAboutAccessibilityText", "mapsButton");
  for (const rule of [/fontSize: 18/, /lineHeight: 24/, /fontWeight: "700"/, /appFonts\.bold/]) assert.match(heading, rule);
  for (const rule of [/marginTop: 10/, /fontSize: 13/, /lineHeight: 22/, /fontWeight: "400"/, /appFonts\.regular/]) assert.match(description, rule);
  for (const rule of [/marginTop: 22/, /fontSize: 15/, /lineHeight: 22/, /fontWeight: "600"/, /appFonts\.semibold/]) assert.match(subheading, rule);
  for (const rule of [/minHeight: 48/, /borderRadius: 12/, /paddingHorizontal: 10/, /paddingVertical: 7/, /gap: 6/]) assert.match(highlight, rule);
  assert.match(styleRule("hotelAboutHighlightGrid", "hotelAboutHighlight"), /marginTop: 8[\s\S]*columnGap: 8[\s\S]*rowGap: 8/);
  for (const rule of [/fontSize: 13/, /lineHeight: 18/, /fontWeight: "500"/, /appFonts\.medium/]) assert.match(highlightText, rule);
  for (const rule of [/fontSize: 13/, /lineHeight: 19/, /fontWeight: "400"/, /appFonts\.regular/]) assert.match(infoText, rule);
  for (const rule of [/fontSize: 13/, /lineHeight: 22/, /fontWeight: "400"/, /appFonts\.regular/]) assert.match(accessibilityText, rule);
  assert.match(details, /size=\{18\}/);
  for (const rule of [/theme\.dark \? theme\.surface : "#F8FAFC"/, /theme\.dark \? theme\.border : "#E2E8F0"/, /theme\.dark \? theme\.textPrimary/, /theme\.dark \? theme\.textSecondary/, /theme\.dark \? hotelAccent/]) assert.match(details, rule);
  assert.match(styleRule("hotelSectionLead", "hotelFactGrid"), /fontSize: 12/);
  assert.match(styleRule("hotelSubheading", "hotelOffer"), /fontSize: 15/);
});