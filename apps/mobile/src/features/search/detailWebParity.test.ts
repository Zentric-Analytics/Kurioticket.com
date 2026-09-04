import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
const hotel = source.slice(source.indexOf("function HotelDetail"), source.indexOf("const detailIcons"));
const gallery = readFileSync("src/features/search/NativeHotelDetails.tsx", "utf8");
const car = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");

test("Hotel details follow mobile-web identity, gallery, tabs, and offer hierarchy", () => {
  assert.match(hotel, />Back to hotel results</);
  for (const icon of ["CalendarDays", "Users", "MapPin", "Award"]) assert.match(hotel, new RegExp(`icon=\\{${icon}\\}`));
  for (const glyph of ["▣", "♙", "⌾"]) assert.doesNotMatch(hotel, new RegExp(glyph));
  assert.ok(hotel.indexOf("d.hotelIdentity") < hotel.indexOf("<NativeHotelGallery"));
  assert.ok(hotel.indexOf("<NativeHotelGallery") < hotel.indexOf('accessibilityRole="tablist"'));
  assert.match(hotel, /stickyHeaderIndices=\{\[2\]\}/);
  for (const tab of ["compare", "about", "location", "reviews"]) assert.match(hotel, new RegExp(`"${tab}"`));
  assert.match(hotel, /Kurioticket room options/);
  assert.doesNotMatch(hotel, /Select room|Choose where to book/);
});

test("Hotel classification and reviews never use legacy rating fallbacks", () => {
  assert.match(hotel, /Number\.isInteger\(result\.classificationStars\)/);
  assert.doesNotMatch(hotel, /Math\.round\(result\.rating\)/);
  assert.match(hotel, /typeof result\.reviewScore === "number"/);
  assert.match(hotel, /typeof result\.reviewScale === "number"/);
  assert.doesNotMatch(hotel, /reviewScore \?\? result\.rating/);
});

test("Native gallery is interactive, truthful, and limited to five thumbnails", () => {
  assert.match(gallery, /useState<string \| null>/);
  assert.match(gallery, /Previous photo/);
  assert.match(gallery, /Next photo/);
  assert.match(gallery, /activeIndex \+ 1/);
  assert.match(gallery, /images\.slice\(0, 5\)/);
  assert.match(gallery, /images\.length - 5/);
  assert.match(gallery, /Property image unavailable/);
  assert.match(gallery, /pagingEnabled/);
});

test("Hotel panels and dock expose web-aligned truthful information", () => {
  for (const heading of ["Compare prices", "About this hotel", "Property highlights", "All amenities", "Room &amp; comfort", "Hotel information", "Accessibility", "Location &amp; stay fit", "Guest reviews"]) assert.match(hotel, new RegExp(heading));
  assert.match(hotel, /estimated stay total/);
  assert.match(hotel, /per night/);
  assert.match(hotel, />Continue booking</);
  assert.match(hotel, /theme\.surface/);
  assert.match(hotel, /theme\.background/);
});

test("Car detail parity remains protected", () => {
  assert.match(car, />Back to Cars results</);
  assert.match(car, /canBookCarOffer\(result\.searchPolicy\.bookable,selected\)/);
});
