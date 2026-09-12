import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildHotelAmenityPresentation } from "../../../../../src/components/results/hotelAmenityPresentation";
import { nativeHotelAmenityLabel } from "./hotelAmenityLabel";

const details = readFileSync("src/features/search/NativeHotelBookingDetails.tsx", "utf8");
const model = readFileSync("src/features/search/nativeHotelBookingDetailsModel.ts", "utf8");
const web = readFileSync("../../src/components/results/hotelDetails/HotelAboutSection.tsx", "utf8");
const amenityLabelSource = readFileSync("src/features/search/hotelAmenityLabel.ts", "utf8");

function styleRule(name: string, nextName: string) {
  const start = details.indexOf(`  ${name}:`);
  const end = details.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return details.slice(start, end);
}

const escaped = (copy: string) => new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

test("active native Details derives the same semantic amenity presentation as web About", () => {
  assert.match(details, /buildHotelAmenityPresentation\([\s\S]*?result\.amenities,[\s\S]*?result\.amenities\.length/);
  assert.doesNotMatch(details, /const highlights = result\.amenities\.slice/);
  assert.doesNotMatch(details, /<Check\b/);
  for (const icon of ["Wifi", "UtensilsCrossed", "Laptop", "Wine", "Bed", "Sparkles", "Award"]) {
    assert.match(details, new RegExp(`\\b${icon}\\b`));
    assert.match(web, new RegExp(`\\b${icon}\\b`));
  }

  const items = buildHotelAmenityPresentation(["Wi-Fi", "Restaurant", "Bar", "Workspaces"], 4)
    .map((item) => ({ ...item, label: nativeHotelAmenityLabel(item) }));
  assert.deepEqual(items.map(({ label }) => label), ["Free Wi-Fi", "Restaurant", "Bar", "Workspaces"]);
  assert.deepEqual(items.map(({ iconKey }) => iconKey), ["wifi", "restaurant", "bar", "generic"]);
  assert.match(amenityLabelSource, /translationKey === "hotelResults\.filter\.freeWifi"[\s\S]*?"Free Wi-Fi"/);
  assert.match(details, /item\.iconKey === "bar" \|\| item\.iconKey === "lounge"/);
  assert.match(details, /return Sparkles/);
});

test("active Details keeps truthful fallbacks while replacing the obsolete highlights fallback", () => {
  for (const copy of [
    "A property description is not available yet.",
    "Property highlights are not available yet.",
    "Room details are confirmed when you choose a room.",
    "Hotel classification is not available.",
    "Specific accessibility features should be confirmed before booking.",
  ]) assert.match(details, escaped(copy));
  assert.doesNotMatch(details, /All available amenities are shown in Property highlights\./);
  assert.match(details, /See all amenities/);
});

test("active Details renders room, hotel information, and accessibility row by row", () => {
  assert.doesNotMatch(details, /\.join\(" · "\)/);
  assert.match(details, /\[property\?\.roomSummary, property\?\.bedSummary\][\s\S]*?\.map[\s\S]*?<Bed accessible=\{false\} size=\{18\}/);
  assert.match(details, /property\?\.propertyType[\s\S]*?<Award accessible=\{false\} size=\{18\}/);
  assert.match(details, /classification \? `\$\{classification\}-star classification` : "Hotel classification is not available\."/);
  assert.match(details, /property\.accessibility\.map\([\s\S]*?>•<\/Text>/);
  assert.doesNotMatch(details, /width: "48%"|flexWrap: "wrap"/);
});

test("About copy is explanatory and built only from existing Hotel facts", () => {
  assert.match(details, /buildNativeHotelAboutCopy/);
  assert.match(model, /const intro = `\$\{name\} is/);
  assert.match(model, /property\.description\.trim\(\)/);
  assert.match(model, /property\.roomSummary\?\.trim\(\)/);
  assert.match(model, /property\.bedSummary\?\.trim\(\)/);
  assert.match(model, /property\.neighbourhood/);
  assert.match(model, /property\.city/);
  assert.doesNotMatch(model, /perfect|best hotel|guaranteed|luxury stay/i);
});

test("active Details keeps booking-page typography with a tightened flat single-column rhythm", () => {
  const heading = styleRule("heading", "description");
  const description = styleRule("description", "fallback");
  const amenityRow = styleRule("amenityRow", "infoRow");
  const rowText = styleRule("rowText", "seeAllRow");
  for (const rule of [/fontSize: 18/, /lineHeight: 24/, /fontWeight: "700"/, /appFonts\.bold/]) assert.match(heading, rule);
  for (const rule of [/marginTop: 8/, /fontSize: 13/, /lineHeight: 22/, /fontWeight: "400"/, /appFonts\.regular/]) assert.match(description, rule);
  assert.match(amenityRow, /flexDirection: "row"/);
  assert.doesNotMatch(amenityRow, /width: "48%"|borderWidth|borderRadius/);
  for (const rule of [/fontSize: 13/, /lineHeight: 20/, /fontWeight: "400"/, /appFonts\.regular/]) assert.match(rowText, rule);
  assert.match(details, /accessibilityLabel="See all amenities"/);
  assert.match(details, /<Modal[\s\S]*?visible=\{amenitiesOpen\}/);
});
