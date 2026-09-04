import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
const hotel = source.slice(source.indexOf("function HotelDetail"), source.indexOf("const detailIcons"));
const gallery = readFileSync("src/features/search/NativeHotelDetails.tsx", "utf8");
const car = readFileSync("src/features/search/ApprovedCarDetailScreen.tsx", "utf8");
const tokens = readFileSync("src/theme/tokens.ts", "utf8");

test("Hotel details follow mobile-web identity, gallery, tabs, and offer hierarchy", () => {
  assert.match(hotel, />Back to hotel results</);
  for (const icon of ["CalendarDays", "Users", "MapPin"]) assert.match(hotel, new RegExp(`icon=\\{${icon}\\}`));
  assert.match(hotel, /<Award accessible=\{false\}/);
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
  assert.match(hotel, /accessibilityLabel=\{`\$\{classification\} star hotel`\}/);
  assert.match(hotel, /\{"★"\.repeat\(classification\)\}/);
  assert.doesNotMatch(hotel.slice(hotel.indexOf("d.hotelIdentity"), hotel.indexOf("d.hotelHeaderActions")), /star classification/);
  assert.match(hotel, /`\$\{classification\}-star classification`/);
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

test("Hotel compare offers preserve each actionable continuation", () => {
  assert.match(hotel, /nativeHotelOffers\(internalRoomFlowAvailable, providerBookable\)/);
  assert.match(hotel, /offer\.kind === "internal-room-flow"/);
  assert.match(hotel, /selectedOffer\?\.kind !== "provider-handoff"/);
  assert.match(hotel, /Linking\.openURL\(redirectUrl\)/);
  assert.match(hotel, /accessibilityState=\{\{ selected \}\}/);
  assert.match(hotel, /accessibilityState=\{\{ disabled: !canContinue \}\}/);
});

test("Car detail parity remains protected", () => {
  assert.match(car, />Back to Cars results</);
  assert.match(car, /pathname:"\/car-results"/);
  assert.ok(car.indexOf("d.titleRow") < car.indexOf("<CarGallery"));
  assert.ok(car.indexOf("<CarGallery") < car.indexOf("d.carSpecGrid"));
  assert.ok(car.indexOf("d.carSpecGrid") < car.indexOf("d.carTabs"));
  for (const tab of ["compare", "pickup", "location"]) assert.match(car, new RegExp(`"${tab}"`));
  assert.match(car, />Compare prices</);
  assert.match(car, /activeTab==="pickup"/);
  assert.match(car, /activeTab==="location"/);
  assert.match(car, /d\.sticky/);
  for (const field of ["passengers", "bags", "doors", "transmission", "airConditioning", "mileagePolicy", "fuelPolicy", "pickupLocation", "returnLocation"]) assert.match(car, new RegExp(`result\\.${field}`));
  assert.match(car, /canBookCarOffer\(result\.searchPolicy\.bookable,selected\)/);
  assert.match(car, /Linking\.openURL\(selected\.bookingUrl\)/);
  assert.match(car, /disabled=\{!bookable\}/);
  for (const token of ["background", "surface", "textPrimary", "textSecondary", "border", "icon"]) assert.match(car, new RegExp(`theme\\.${token}`));
});

test("Hotel Details owns canonical brand accents and preserves pressed blue", () => {
  assert.match(tokens, /blue: "#004BB8"/);
  for (const style of ["hotelTabActive", "hotelTabTextActive", "hotelReviewScore", "selectionControlSelected", "mapsButton", "hotelContinue"]) {
    assert.match(source, new RegExp(`${style}[^\\n]*colors\\.blue`));
  }
  assert.match(source, /hotelContinuePressed: \{ backgroundColor: "#003B91" \}/);
});

test("Room modal receives display-price truth and does not format source currency", () => {
  assert.match(hotel, /createHotelRoomDisplayPrice/);
  assert.match(hotel, /options=\{presentedRoomOptions\}/);
  assert.doesNotMatch(gallery, /Intl\.NumberFormat/);
  assert.match(gallery, /displayPrice\.total\.accessibilityLabel/);
  assert.match(gallery, /displayPrice\.nightly\.accessibilityLabel/);
});
