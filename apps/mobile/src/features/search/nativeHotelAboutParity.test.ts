import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildHotelAmenityPresentation } from "../../../../../src/components/results/hotelAmenityPresentation";
import { nativeHotelAmenityLabel } from "./hotelAmenityLabel";

const source = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
const hotel = source.slice(source.indexOf("function HotelDetail"), source.indexOf("const detailIcons"));
const about = hotel.slice(hotel.indexOf('activeHotelTab === "about"'), hotel.indexOf('activeHotelTab === "location"'));
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

test("native About derives the same semantic amenity presentation as web", () => {
  assert.match(hotel, /buildHotelAmenityPresentation\([\s\S]*?result\.amenities,[\s\S]*?result\.amenities\.length/);
  assert.doesNotMatch(hotel, /const highlights = result\.amenities\.slice/);
  assert.doesNotMatch(about, /<Check\b/);
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

test("native About preserves the exact web fallback copy and removes stale native copy", () => {
  for (const copy of [
    "A property description is not available yet.", "Property highlights are not available yet.",
    "All available amenities are shown in Property highlights.", "Room details are confirmed when you choose a room.",
    "Hotel classification is not available.", "Specific accessibility features should be confirmed before booking.",
  ]) { assert.match(about, escaped(copy)); assert.match(web, escaped(copy)); }
  for (const stale of ["No additional verified amenities are listed.", "Verified property highlights are not available yet.", "Property type and classification are not available."]) assert.doesNotMatch(about, escaped(stale));
});

test("native About renders room, hotel information, and accessibility row by row", () => {
  assert.doesNotMatch(about, /\.join\(" · "\)/);
  assert.match(about, /\[property\?\.roomSummary, property\?\.bedSummary\][\s\S]*?\.map[\s\S]*?<Bed accessible=\{false\} size=\{18\}/);
  assert.match(about, /property\?\.propertyType[\s\S]*?<Award accessible=\{false\} size=\{18\}/);
  assert.match(about, /classification \? `\$\{classification\}-star classification` : "Hotel classification is not available\."/);
  assert.match(about, /property\.accessibility\.map\([\s\S]*?hotelAboutAccessibilityItem[\s\S]*?>•<\/Text>/);
});

test("native About owns web-aligned geometry, typography, rhythm, and dark-mode colors", () => {
  const heading = styleRule("hotelAboutHeading", "hotelAboutDescription");
  const description = styleRule("hotelAboutDescription", "hotelAboutSubheading");
  const subheading = styleRule("hotelAboutSubheading", "hotelAboutFallback");
  const highlight = styleRule("hotelAboutHighlight", "hotelAboutHighlightText");
  const highlightText = styleRule("hotelAboutHighlightText", "hotelAboutList");
  for (const rule of [/fontSize: 20/, /lineHeight: 28/, /appFonts\.extraBold/]) assert.match(heading, rule);
  for (const rule of [/marginTop: 12/, /fontSize: 14/, /lineHeight: 24/, /appFonts\.regular/]) assert.match(description, rule);
  for (const rule of [/marginTop: 28/, /fontSize: 16/, /lineHeight: 24/, /fontWeight: "700"/, /appFonts\.bold/]) assert.match(subheading, rule);
  for (const rule of [/minHeight: 56/, /borderRadius: 12/, /paddingHorizontal: 12/, /paddingVertical: 10/, /gap: 12/]) assert.match(highlight, rule);
  for (const rule of [/fontSize: 14/, /lineHeight: 20/, /fontWeight: "600"/, /appFonts\.semibold/]) assert.match(highlightText, rule);
  assert.match(about, /size=\{18\}/);
  for (const rule of [/theme\.dark \? theme\.surface : "#F8FAFC"/, /theme\.dark \? theme\.border : "#E2E8F0"/, /theme\.dark \? theme\.textPrimary/, /theme\.dark \? theme\.textSecondary/, /theme\.dark \? hotelAccent/]) assert.match(about, rule);
  assert.match(styleRule("hotelSectionLead", "hotelFactGrid"), /fontSize: 12/);
  assert.match(styleRule("hotelSubheading", "hotelOffer"), /fontSize: 15/);
});
